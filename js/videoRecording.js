
const VIDEO_ENCODING_PREFERENCES = [
	"video/webm; codecs=vp9",
	"video/webm; codecs=h264",
	"video/webm; codecs=vp8",
];

function getMediaRecorderOptions() {
	const videoEncoding =
		window.VIDEO_ENCODING_PREFERENCE ||
		VIDEO_ENCODING_PREFERENCES.find((encoding) =>
			window.MediaRecorder.isTypeSupported(encoding)
		);

	return {
		mimeType:
			navigator.userAgent.toLowerCase().indexOf("firefox") > -1
				? 'video/webm;codecs="vp8,opus"'
				: videoEncoding,
		// Browser will cap the max supported value automatically.
		videoBitsPerSecond: Number.MAX_SAFE_INTEGER,
		audioBitsPerSecond: Number.MAX_SAFE_INTEGER,
	};
}

function mergeAudioTracks(trackOne, trackTwo) {
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const channelMerger = audioCtx.createChannelMerger(2);
	const dest = audioCtx.createMediaStreamDestination();
	const sourceOne = audioCtx.createMediaStreamSource(
		new window.MediaStream([trackOne])
	);
	const sourceTwo = audioCtx.createMediaStreamSource(
		new window.MediaStream([trackTwo])
	);
	sourceOne.connect(channelMerger, 0, 0);
	sourceTwo.connect(channelMerger, 0, 1);
	channelMerger.connect(dest);
	return dest.stream;
}

/**
 Adding seek cues is a synchronous operation that is made async because we
 need to operate on a Buffer-like data structure instead of Blob.
 The ts-ebml lib that we use adds metadata to the WebM container. Adding metadata
 is a rather fast operation because we don't have to touch the video and only
 decorate it with more metadata.

 Found the ts-ebml lib through the following Chromium bug ticket:
 https://bugs.chromium.org/p/chromium/issues/detail?id=642012

 For more info on the EBML metadata specification, check:
 https://github.com/Matroska-Org/ebml-specification/blob/master/specification.markdown

 And for the WebM spec, please check:
 https://www.webmproject.org/docs/container/#implementation-details
 */
const addSeekCues = (recordingBlob) =>
	new Promise((resolve, reject) => {
		const fileReader = new FileReader();

		// Async processing of the video after transformation to ArrayBuffer.
		fileReader.onload = () => {
			try {
				const recordedArrayBuffer = fileReader.result;
				const decoder = new ebml.Decoder();
				const reader = new ebml.Reader();
				const emls = decoder.decode(recordedArrayBuffer);
				emls.forEach((elem) => reader.read(elem));
				reader.stop();
				const refinedMetadataBuf = ebml.tools.makeMetadataSeekable(
					reader.metadatas,
					reader.duration,
					reader.cues
				);
				const body = recordedArrayBuffer.slice(reader.metadataSize);

				// Resolve the Promise after we have added the seek cues.
				resolve(new Blob([refinedMetadataBuf, body], { type: "video/webm" }));
			} catch (error) {

			}
		};

		fileReader.onerror = (error) => {
			reject(error);
		};

		// Read the Blob to an ArrayBuffer.
		fileReader.readAsArrayBuffer(recordingBlob);
	});

/**
 Abstract the actual video recording so we can change the implementation later if needed.
 For now, we choose to keep the Blob in memory until it is proven that it should be changed.
 A next step could be storing the Blob parts in IndexedDB and/or start upload in chunks.

 Reading the docs, it is fine to keep the Blob in memory as Chrome automatically
 will pipe the Blob to disk as it gets too big to keep in RAM.

 Check 'Summary and Terminology' at:
 https://chromium.googlesource.com/chromium/src/+/224e43ce1ca4f6ca6f2cd8d677b8684f4b7c2351/storage/browser/blob/README.md
 */
class VideoRecorder {
	constructor(streamToRecord, onRecordingEnded = () => {}) {
		this.recordedChunks = [];
		this.recorder = null;
		this.stream = streamToRecord;
		this.onRecordingEnded = onRecordingEnded;
		this.startRecordingTime = Date.now();
	}

	startRecording(nprId) {
		console.log("recording started");
		this.recorder = new window.MediaRecorder(
			this.stream,
			getMediaRecorderOptions()
		);

		this.recorder.ondataavailable = (evt) => {
			this.recordedChunks.push(evt.data);
		};

		this.recorder.onstop = (evt) => {
			// addSeekCues(
			// 	new Blob(this.recordedChunks, { type: "video/webm" })
			// ).then((blob) => {
			// 	downloadVideoRecording(blob, `test-file`);
			// });
			console.log("recording stopped");
			const blob = new Blob(this.recordedChunks, { type: "video/webm" }, Date.now());
			downloadVideoRecording(blob, `test-file`);
			this.recorderChunks = null; // Remove reference
		};

		this.recorder.start(1000);
		this.startRecordingTime = Date.now();
	}

	stopRecording(overrideAfterEnd) {
		if (overrideAfterEnd) {
			this.onRecordingEnded = (recording) =>
				addSeekCues(recording).then(overrideAfterEnd);
		}
		this.recorder.stop();
	}

	// Utility to combine one videotrack and 2 audio tracks into one MediaStream.
	// If more than two audio tracks are provided, only the first two are used.
	// Audio tracks are put on separate speakers (L or R), working from left to right.
	static streamFromTracks(videoTrack, ...audioTracks) {
		if (audioTracks.length === 0) {
			return new window.MediaStream([videoTrack]);
		} else {
			const audioToMerge =
				audioTracks.length === 1
					? [audioTracks[0], audioTracks[0]]
					: audioTracks.slice(0, 2);
			const mergedAudio = mergeAudioTracks(...audioToMerge);
			return new window.MediaStream([
				videoTrack,
				...mergedAudio.getAudioTracks(),
			]);
		}
	}
}

//used only for debugging purposes, disabled in production
function downloadVideoRecording(videoBlob, filename) {
	const url = URL.createObjectURL(videoBlob);
	const a = document.createElement("a");
	document.body.appendChild(a);
	a.style = "display: none";
	a.href = url;
	a.download = `${filename}.webm`;
	a.click();
	window.URL.revokeObjectURL(url);
}
