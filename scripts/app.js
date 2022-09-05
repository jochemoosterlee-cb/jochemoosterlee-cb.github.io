const record = document.querySelector('.record');
const stop = document.querySelector('.stop');
const videoClips = document.querySelector('.video-clips');
const mainSection = document.querySelector('.main-controls');
const videoElement = document.querySelector("#videoElement");

stop.disabled = true;

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');

  const constraints = { audio: true, video: true };
  let chunks = [];

  let onSuccess = function(stream) {
    const options = {
      mimeType: 'video/webm; codecs="vp8,opus"'
    }
    const mediaRecorder = new MediaRecorder(stream, options);
    videoElement.srcObject = stream;
    

    record.onclick = function() {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      const clipName = prompt('Enter a name for your video clip?','My unnamed clip');

      const clipContainer = document.createElement('article');
      const clipLabel = document.createElement('p');
      const video = document.createElement('video');
      const deleteButton = document.createElement('button');

      clipContainer.classList.add('clip');
      video.setAttribute('controls', '');
      video.setAttribute('style', 'width : 25%;');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      if(clipName === null) {
        clipLabel.textContent = 'My unnamed clip';
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(video);
      clipContainer.appendChild(deleteButton);
      clipContainer.appendChild(clipLabel);
      videoClips.appendChild(clipContainer);

      video.controls = true;
      const blob = new Blob(chunks, { 'type' : 'video/webm; codecs=vp8,opus' });
      chunks = [];
      const videoURL = window.URL.createObjectURL(blob);
      video.src = videoURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        let evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }

      clipLabel.onclick = function() {
        const existingName = clipLabel.textContent;
        const newClipName = prompt('Enter a new name for your video clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
      console.log(chunks);
    }
  }

  let onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  

} else {
   console.log('getUserMedia not supported on your browser!');
}
