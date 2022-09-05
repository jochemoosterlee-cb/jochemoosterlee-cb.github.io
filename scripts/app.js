const record = document.querySelector('.record');
const stop = document.querySelector('.stop');
const videoClips = document.querySelector('.video-clips');
const mainSection = document.querySelector('.main-controls');
const videoElement = document.querySelector("#videoElement");

stop.disabled = true;

if (navigator.mediaDevices.getUserMedia) {

  const constraints = { audio: true, video: true };
  let chunks = [];

  let onSuccess = function(stream) {
    const options = {
      mimeType: 'video/webm; codecs="vp8"'
    }
    const mediaRecorder = new MediaRecorder(stream, options);
    console.log(options);
    videoElement.srcObject = stream;
    

    record.onclick = function() {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      record.style.background = "";
      record.style.color = "";
      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {

      const clipContainer = document.createElement('article');
      const clipLabel = document.createElement('p');
      const video = document.createElement('video');

      clipContainer.classList.add('clip');
      video.setAttribute('controls', '');
      video.setAttribute('style', 'width : 25%;');

      clipLabel.textContent = Date.now();

      clipContainer.appendChild(video);
      clipContainer.appendChild(clipLabel);
      videoClips.appendChild(clipContainer);

      video.controls = true;
      const blob = new Blob(chunks, { 'type' : 'video/webm; codecs=vp8' });
      chunks = [];
      const videoURL = window.URL.createObjectURL(blob);
      video.src = videoURL;

    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
      console.log(chunks);
    }
  }

  let onError = function(err) {
    console.log(err);
  }

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  

} else {
   console.log('getUserMedia not supported on your browser!');
}
