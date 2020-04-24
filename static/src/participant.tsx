import React, { useState, useEffect, useRef } from "react";
import Video from "twilio-video";
import { notNull, notEmpty } from "./util";

const Participant = (props: { participant: Video.Participant, onScreenshot?: (dataUrl: string) => void, viewScreenshot?: boolean }) => {
	const [videoTracks, setVideoTracks] = useState<any[]>([]);
	const [audioTracks, setAudioTracks] = useState<any[]>([]);
	const [sshotState, setSshotState] = useState<string>("none");

	const videoRef = useRef<HTMLVideoElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const trackpubsToTracksV = (trackMap: Map<string, Video.VideoTrackPublication>) =>
		Array.from(trackMap.values())
			.map(publication => publication.track)
			.filter(notEmpty);

	const trackpubsToTracksA = (trackMap: Map<string, Video.AudioTrackPublication>) =>
		Array.from(trackMap.values())
			.map(publication => publication.track)
			.filter(notEmpty);

	useEffect(() => {
		setVideoTracks(trackpubsToTracksV(props.participant.videoTracks));
		setAudioTracks(trackpubsToTracksA(props.participant.audioTracks));

		const trackSubscribed = (track: Video.Track) => {
			if (track.kind === "video") {
				setVideoTracks((videoTracks) => [...videoTracks, track]);
			} else if (track.kind === "audio") {
				setAudioTracks((audioTracks) => [...audioTracks, track]);
			}
		};

		const trackUnsubscribed = (track: any) => {
			if (track.kind === "video") {
				setVideoTracks((videoTracks) => videoTracks.filter((v) => v !== track));
			} else if (track.kind === "audio") {
				setAudioTracks((audioTracks) => audioTracks.filter((a) => a !== track));
			}
		};

		props.participant.on("trackSubscribed", trackSubscribed);
		props.participant.on("trackUnsubscribed", trackUnsubscribed);

		return () => {
			setVideoTracks([]);
			setAudioTracks([]);
			props.participant.removeAllListeners();
		};
	}, [props.participant]);

	useEffect(() => {
		const videoTrack = videoTracks[0];
		if (videoTrack) {
			videoTrack.attach(videoRef.current);

			return () => {
				videoTrack.detach();
			};
		}
	}, [videoTracks]);

	useEffect(() => {
		const audioTrack = audioTracks[0];
		if (audioTrack) {
			audioTrack.attach(audioRef.current);
			return () => {
				audioTrack.detach();
			};
		}
	}, [audioTracks]);

	useEffect(() => {
		if (sshotState === "capture") {
			if (canvasRef.current === null || videoRef.current === null) {
				return;
			}

			canvasRef.current.width = videoRef.current.videoWidth;
			canvasRef.current.height = videoRef.current.videoHeight;
			var ctx = canvasRef.current.getContext('2d');
			notNull(ctx).drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
		}
	}, [sshotState]);

	const submitSshot = () => {
		if (props.onScreenshot !== undefined) {
			props.onScreenshot(notNull(canvasRef.current).toDataURL("image/jpeg"));
		}
	}

	useEffect(() => {
		if (props.viewScreenshot !== undefined && props.viewScreenshot) {
			setSshotState("capture");
		}
		else {
			setSshotState("none");
		}
	}, [props.viewScreenshot]);

	let sshotPopup = null;
	if (props.viewScreenshot !== undefined && props.viewScreenshot) {
		sshotPopup = <div className="challenge-preview">
			<canvas ref={canvasRef} />
			<div onClick={submitSshot}>
				submit
			</div>
		</div>
	}

	return (
		<div className="participant">
			{sshotPopup}
			<h3>{props.participant.identity}</h3>
			<video ref={videoRef} autoPlay={true} />
			<audio ref={audioRef} autoPlay={true} muted={true} />
		</div>
	);
};

export default Participant;