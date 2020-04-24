import { useState, useCallback, useEffect } from "react";
import React from "react";
import { getVideoToken } from "./api";
import { bind2 } from "./util";
import Video from 'twilio-video';
import Participant from "./participant";

const Room = (props: { roomName: any, token: any, handleLogout: any, onScreenshot?: (dataUri: string) => void }) => {
	const [room, setRoom] = useState<Video.Room | null>(null);
	const [participants, setParticipants] = useState<Video.Participant[]>([]);
	const [previewLocalScreenshot, setPreviewLocalScreenshot] = useState(false);

	useEffect(() => {
		const participantConnected = (participant: Video.Participant) => {
			setParticipants(prevParticipants => [...prevParticipants, participant]);
		};

		const participantDisconnected = (participant: Video.Participant) => {
			setParticipants(prevParticipants =>
				prevParticipants.filter(p => p !== participant)
			);
		};

		Video.connect(props.token, {
			name: props.roomName
		}).then(room => {
			setRoom(room);
			room.on("participantConnected", participantConnected);
			room.on("participantDisconnected", participantDisconnected);
			room.participants.forEach(participantConnected);
		});

		// cleanup
		return () => {
			setRoom(currentRoom => {
				if (currentRoom && currentRoom.localParticipant.state === "connected") {
					currentRoom.localParticipant.tracks.forEach(function (trackPublication: any) {
						trackPublication.track.stop();
					});
					currentRoom.disconnect();
					return null;
				} else {
					return currentRoom;
				}
			});
		};
	}, [props.roomName, props.token]);

	const remoteParticipants = participants.map(participant => (
		<Participant key={participant.sid} participant={participant} />
	));

	const onLocalScreenshot = (dataUri: string) => {
		setPreviewLocalScreenshot(false);

		if (props.onScreenshot !== undefined) {
			props.onScreenshot(dataUri);
		}
	}

	let localParticipant = null;
	if (room !== null) {
		localParticipant = <Participant key={room.localParticipant.sid} participant={room.localParticipant} onScreenshot={onLocalScreenshot} viewScreenshot={previewLocalScreenshot} />
	}

	const sshotButtonClick = () => {
		setPreviewLocalScreenshot(true);
	}

	return (
		<div className="room">
			<h2>Room: {props.roomName}</h2>
			<button onClick={props.handleLogout}>Log out</button>
			<div className="local-participant">
				{localParticipant}
			</div>
			<div onClick={sshotButtonClick}>
				take screenshot
			</div>
			<h3>Remote Participants</h3>
			<div className="remote-participants">{remoteParticipants}</div>
		</div>
	);
};

const VideoChat = (props: { username: string, roomname: string, onScreenshot?: (dataUri: string) => void }) => {
	const [token, setToken] = useState<string | null>(null);

	const handleLogin = async () => {
		bind2(await getVideoToken(props.username, props.roomname), err => {
			// err
		}, token => {
			setToken(token);
		});
	};

	const handleLogout = useCallback(() => {
		setToken(null);
	}, []);

	let render = null;
	if (token) {
		render = (
			<Room roomName={props.roomname} token={token} handleLogout={handleLogout} onScreenshot={props.onScreenshot} />
		);
	}
	else {
		render = <button onClick={handleLogin}>Log in</button>
	}

	return render;
};

export default VideoChat;