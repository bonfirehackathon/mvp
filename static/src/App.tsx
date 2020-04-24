import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { Route, BrowserRouter, useHistory, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import YouTube, { Options } from 'react-youtube';
import InfiniteScroll from 'react-infinite-scroller';
import { AuthenticatedUser, ChallengeListing, getChallenge, getInstance, ChallengeInstance, ChallengeMedia,
	getMedia, getChallenges, createInstance, ChallengeVote, ChallengeInstanceMedia, pollPictures, pollVotes, uploadMedia, castVote } from './api';
import { bind2, notNull } from './util';
import VideoChat from './video_chat';
import querystring from 'query-string';
import { data } from './data';

function getCurrentAuthentication(): AuthenticatedUser {
	// get user data from localstorage
	const userid = querystring.parse(window.location.search).user ?? "test_user";

	return { id: userid as string, token: "none" }
}

function LandingChallengeCard(props: { listing: ChallengeListing, previewChallenge: (l: ChallengeListing) => void }) {
	let videoEmbed = null;

	if (props.listing.preview_uri.startsWith("yt/")) {
		const opts: Options = {
			height: '200',
			width: '300',
			playerVars: {
				autoplay: 0,
			},
		};
		videoEmbed = <YouTube videoId={props.listing.preview_uri.slice(3)} opts={opts} />
	}

	return <div className="challenge-card">
		{props.listing.name} by {props.listing.creator_id}
		<div>
			<div>embed preview</div>
			{videoEmbed}
		</div>
		<div className="challenge-card-start-div" onClick={() => props.previewChallenge(props.listing)}>
			view challenge
    </div>
	</div>;
}

function Landing(props: any) {
	return ChallengeCardGrid();
}

function ChallengeCardGrid() {
	let history = useHistory();
	let cardsPerRow = 2;

	const [challenges, setChallenges] = useState<ChallengeListing[]>([]);
	const [hasMoreChallenges, setHasMoreChallenges] = useState(true);
	const [challengePreview, setChallengePreview] = useState<ChallengeListing | null>(null);

	function makeRow(elements: JSX.Element[], key: number) {
		return <Row xs={2} key={key}>{elements}</Row>
	}

	const loadChallenges = useCallback(async (page: number) => {
		bind2(await getChallenges(), err => {
			// error
		}, challenges => {
			setChallenges(challenges);
			setHasMoreChallenges(false);
		})
	}, []);

	const makeCard = (challenge: ChallengeListing, key: number) => {
		return <Col className="challenge-card-col" key={key}>
			<LandingChallengeCard listing={challenge} previewChallenge={() => setChallengePreview(challenge)} />
		</Col>
	}

	const onCreateInstance = useCallback(async () => {
		if (challengePreview === null) {
			return;
		}

		bind2(await createInstance(challengePreview.id), err => {
			// error
		}, instance => {
			history.push(`/challenge/${instance.id}`);
		});
	}, [challengePreview, history]);

	let rows: JSX.Element[] = []
	let currentRowElements: JSX.Element[] = [];
	for (let el of challenges) {
		if (currentRowElements.length >= cardsPerRow) {
			rows.push(makeRow(currentRowElements, rows.length));
			currentRowElements = [makeCard(el, 0)];
		}
		else {
			currentRowElements.push(makeCard(el, currentRowElements.length));
		}
	}

	if (currentRowElements.length > 0) {
		rows.push(makeRow(currentRowElements, rows.length))
	}

	let loader = <div key={"LK"}>Loading</div>;
	let challengePreviewPopup: JSX.Element | null = null;

	if (challengePreview !== null) {
		challengePreviewPopup = <div className="challenge-preview">
				preview
			<div onClick={onCreateInstance}>
				start challenge
			</div>
		</div>
	}

	return <>
		{challengePreviewPopup}
		<InfiniteScroll
			pageStart={0}
			loadMore={loadChallenges}
			hasMore={hasMoreChallenges}
			loader={loader}>
			<Container className="challenge-card-grid">
				{rows}
			</Container>
		</InfiniteScroll>
	</>;
}

function ChallengeMainMedia(props: { challengeMedia: ChallengeMedia[] | null }) {
	let embedElement = null;
	if (props.challengeMedia !== null) {
		let sortedMedia = props.challengeMedia.sort((a, b) => b.priority - a.priority)

		if (sortedMedia.length > 0) {
			let mainMedia = sortedMedia[0];

			if (mainMedia.uri.startsWith("yt/")) {
				const opts: Options = {
					height: '600',
					width: '800',
					playerVars: {
						autoplay: 0,
					},
				};
				embedElement = <YouTube videoId={mainMedia.uri.slice(3)} opts={opts} />
			}
		}
	}

	return <div className="challenge-main-media">
		{embedElement}
	</div>
}

function ChallengeResultVoter(props: { instance: ChallengeInstance }) {
	const [state, setState] = useState("poll-sub");
	const [submissionPics, setSubmissionPics] = useState<ChallengeInstanceMedia[] | null>(null);
	const [votes, setVotes] = useState<ChallengeVote[] | null>(null);

	useEffect(() => {
		const interval = setInterval(async () => {
			if (state === "poll-sub") {
				console.log("polling submissions");
				
				bind2(await pollPictures(props.instance.id), (err) => {
					console.log(err);
				}, (media) => {
					setSubmissionPics(media);
					setState("ask-vote");
				})
			}
			else if (state === "poll-vote") {
				console.log("polling votes"); 

				bind2(await pollVotes(props.instance.id), (err) => {
					console.log(err);
				}, (votes) => {
					setVotes(votes);
					setState("done");
					clearInterval(interval);
				});
			}
			else if (state === "done") {
				clearInterval(interval);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [props.instance, state]);

	const onVoteClick = (mediaId: string) => {
		return async () => {
			if (state !== "ask-vote") return;

			bind2(await castVote(props.instance.id, mediaId), err => {
				console.log(err);
			}, v => {
				setState("poll-vote");
			});
		};
	};

	if (state === "poll-sub") {
		return <div>
			Waiting for everyone's submissions to come in...
		</div>
	}

	let images = [];
	let pics = notNull(submissionPics);
	let voteCount: Map<string, number> = new Map<string, number>();

	if (votes !== null) {
		for (const i of votes) {
			if (voteCount.has(i.votee_id)) {
				voteCount.set(i.votee_id, notNull(voteCount.get(i.votee_id)) + 1);
			}
			else {
				voteCount.set(i.votee_id, 1);
			}
		}
	}

	for (const j of pics) {
		let voteElement = null;
		if (votes !== null) {
			if (voteCount.has(j.id)) {
				voteElement = <>Votes: {voteCount.get(j.id)}</>;
			}
		}

		images.push(<>
			<img src={j.data} key={j.id} onClick={onVoteClick(j.id)} alt={"Image submission"}></img>
			{voteElement}
		</>);
	}

	let voteInstruction = null;
	if (state === "ask-vote") {
		voteInstruction = <div>Click an image to vote</div>
	}
	else if (state === "poll-vote") {
		voteInstruction = <div>Vote cast, please wait for others' votes</div>
	}
	else if (state === "done") {
		voteInstruction = <div>We have a winner!</div>
	}

	return <div>
		Everyone's submissions:
		<div>
			{images}
		</div>
		{voteInstruction}
	</div>
}

function ChallengeRoom() {
	let instanceId = useParams<{ instanceId: string }>().instanceId;
	// TODO cache challenge data call?

	const [sshotSent, setSshotSent] = useState(false);
	const [instanceData, setInstanceData] = useState<ChallengeInstance | null>(null);
	const [userAuth, setUserAuth] = useState<AuthenticatedUser | null>(null);
	const [challengeListing, setChallengeListing] = useState<ChallengeListing | null>(null);
	const [challengeMedia, setChallengeMedia] = useState<ChallengeMedia[] | null>(null);

	// useeffect doesn't take a direct async callable
	useEffect(() => {
		(async () => {
			bind2(await getInstance(instanceId), err => {
				console.log(err);
			}, instance => {
				setInstanceData(instance);
			});
		})();

		setUserAuth(getCurrentAuthentication());
	}, [instanceId]);

	useEffect(() => {
		if (instanceData === null) {
			return;
		}
		if (userAuth === null) {
			return;
		}

		(async () => {
			bind2(await getChallenge(instanceData.challenge_id), err => {
				// err
			}, challenge => {
				setChallengeListing(challenge);
			});
		})();

		(async () => {
			bind2(await getMedia(instanceData.challenge_id), err => {
				// err
			}, media => {
				setChallengeMedia(media);
			});
		})();
	}, [instanceData, userAuth]);

	const onScreenshot = useCallback(async (dataUri: string) => {
		if (instanceData === null) {
			return;
		}

		bind2(await uploadMedia(dataUri, instanceData.id, getCurrentAuthentication().id), err => {
		}, media => {
			setSshotSent(true);
		});
	}, [instanceData]);

	let videoChat = null;
	if (userAuth !== null && instanceData !== null) {
		videoChat = <VideoChat username={userAuth.id} roomname={instanceData.id} onScreenshot={onScreenshot}/>
	}

	let resultVoter = null;
	if (sshotSent && instanceData !== null) {
		resultVoter = <ChallengeResultVoter instance={instanceData} />
	}

	return <div className="challenge-container">
		<ChallengeMainMedia challengeMedia={challengeMedia} />
		{videoChat}
		{resultVoter}
	</div>
}

function App() {
	return (
		<div className="App">
			<header className="App-header">
				Welcome
			</header>
			<BrowserRouter>
				<Route exact path="/" component={Landing} />
				<Route path="/challenge/:instanceId" component={ChallengeRoom} />
			</BrowserRouter>
		</div>
	);
}

export default App;