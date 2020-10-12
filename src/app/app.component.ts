import { Component, OnInit } from '@angular/core';
import { AgoraClient, ClientEvent, NgxAgoraService, Stream, StreamEvent } from 'ngx-agora';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'angular-video';
  localCallId = 'agora_local';
  remoteCalls: string[] = [];

  private client: AgoraClient;
  private localStream: Stream;
  private uid: number;

  constructor(private ngxAgoraService: NgxAgoraService) {
    this.uid = Math.floor(Math.random() * 100);
  }

  handleCamera = (e) => {
    e.currentTarget.classList.toggle('off')
    this.localStream.isVideoOn() ?
      this.localStream.disableVideo() : this.localStream.enableVideo()
  }

  handleMic = (e) => {
    e.currentTarget.classList.toggle('off')
    this.localStream.isAudioOn() ?
      this.localStream.disableAudio() : this.localStream.enableAudio()
  }

  handleExit = (e) => {
    if (e.currentTarget.classList.contains('disabled')) {
      return
    }
    try {
      this.client && this.client.unpublish(this.localStream)
      this.localStream && this.localStream.close()
      this.client && this.client.leave(() => {
        console.log('Client succeed to leave.')
      }, () => {
        console.log('Client failed to leave.')
      })
    }
    finally {
      this.client = null
      this.localStream = null
      // redirect to index
      window.location.hash = ''
    }
  }

  ngOnInit() {
    this.client = this.ngxAgoraService.createClient({ mode: 'rtc', codec: 'h264' });
    this.assignClientHandlers();
    this.localStream = this.ngxAgoraService.createStream({ streamID: this.uid, audio: true, video: true, screen: false });
    this.assignLocalStreamHandlers();
    // Join and publish methods added in this step
    this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
    
  }
  // onCall(data, btn) {
  //   if(btn==1){
  //     console.log("btnnn",btn)
  //     this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
  //   }else if(btn==0){
  //     this.initLocalStream(() => this.join(() => this.publish(), error => console.error(error)));
  //   }
  // }
  

  // onCall(data, btn) {
  //   let roomID = ''
  //   let audio_status = true;
  //   let video_status = true;
  //   if(btn==1){
  //     roomID = data;
  //   }
  //   if(btn==0){
  //     roomID = '';
  //   }
    
  //   this.client = this.ngxAgoraService.createClient({ mode: 'rtc', codec: 'h264' });
  //   this.assignClientHandlers();

  //   this.localStream = this.ngxAgoraService.createStream({ streamID: roomID, audio: audio_status, video: video_status, screen: false });
  //   this.assignLocalStreamHandlers();
  //   // Join and publish methods added in this step
  //   this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
  //   // alert('I am ready')
  // }



  /**
   * Attempts to connect to an online chat room where users can host and receive A/V streams.
   */
  join(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void {
    this.client.join(null, 'foo-bar', this.uid, onSuccess, onFailure);
  }

  /**
   * Attempts to upload the created local A/V stream to a joined chat room.
   */
  publish(): void {
    this.client.publish(this.localStream, err => console.log('Publish local stream error: ' + err));
  }

  private assignClientHandlers(): void {

    this.client.on(ClientEvent.LocalStreamPublished, evt => {
      console.log('Publish local stream successfully');
    });

    this.client.on(ClientEvent.Error, error => {
      console.log('Got error msg:', error.reason);
      if (error.reason === 'DYNAMIC_KEY_TIMEOUT') {
        this.client.renewChannelKey(
          '',
          () => console.log('Renewed the channel key successfully.'),
          renewError => console.error('Renew channel key failed: ', renewError)
        );
      }
    });

    this.client.on(ClientEvent.RemoteStreamAdded, evt => {
      const stream = evt.stream as Stream;
      this.client.subscribe(stream, { audio: true, video: true }, err => {
        console.log('Subscribe stream failed', err);
      });
    });

    this.client.on(ClientEvent.RemoteStreamSubscribed, evt => {
      const stream = evt.stream as Stream;
      const id = this.getRemoteId(stream);
      if (!this.remoteCalls.length) {
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id), 1000);
      }
    });

    this.client.on(ClientEvent.RemoteStreamRemoved, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = [];
        console.log(`Remote stream is removed ${stream.getId()}`);
      }
    });

    this.client.on(ClientEvent.PeerLeave, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`Arjun_ ${evt.uid} left from this channel`);
      }
    });
  }

  private assignLocalStreamHandlers(): void {
    this.localStream.on(StreamEvent.MediaAccessAllowed, () => {
      console.log('accessAllowed');
    });

    // The user has denied access to the camera and mic.
    this.localStream.on(StreamEvent.MediaAccessDenied, () => {
      console.log('accessDenied');
    });
  }

  private initLocalStream(onSuccess?: () => any): void {
    this.localStream.init(
      () => {
        // The user has granted access to the camera and mic.
        this.localStream.play(this.localCallId);
        if (onSuccess) {
          onSuccess();
        }
      },
      err => console.error('Arjun_ getUserMedia failed', err)
    );
  }

  private getRemoteId(stream: Stream): string {
    return `agora_remote-${stream.getId()}`;
  }

  

}
