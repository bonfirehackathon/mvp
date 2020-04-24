import { left, right, Either, bind, bindA } from "./util";

export interface AuthenticatedUser {
	id: string;
	token: string;
}

export interface ChallengeListing {
	id: string;
	name: string;
	desc: string;
	date_created: string;
	preview_uri: string;
	listing_uri: string;
	creator_id: string;

	/*
	estimatedTimeMins: number;
	minPlayers: number;
	maxPlayers: number;
	creatorName: string;
	creatorId: string;
	*/
}

export interface ChallengeInstance {
	id: string;
	challenge_id: string;
	creator_id: string;
}

export interface ChallengeParticipant {
	id: string;
	challenge_instance_id: string;
	participant_id: string;
	date_joined: string;
}

export interface ChallengeMedia {
	id: string;
	challenge_id: string;
	uri: string;
	tooltip: string;
	priority: number;
}

export interface ChallengeInstanceMedia {
	id: string;
	challenge_instance_id: string;
	user_id: string;
	data: string;
}

export interface ChallengeVote {
	id: string;
	challenge_instance_id: string;
	votee_id: string;
}


function getErrorString(resp: Response, respJson: any): string {
	console.log(respJson)
	if ("message" in respJson) {
		return respJson.message;
	}
	else {
		return `Server error: ${resp.statusText}`;
	}
}

export function defaultHeaders(authToken: string | null = null, contentType: string = "application/json"): any {
	const headers: any = { "Content-Type": contentType };
	if (authToken !== null) {
		headers.Authorization = `Bearer ${authToken}`;
	}

	return headers
}

export async function fetchRaw(endpoint: RequestInfo, options: RequestInit): Promise<Either<string, Response>> {
	try {
		const resp = await fetch(endpoint, options);
		if (!resp.ok) {
			return left("error");
		}

		return right(resp);
	}
	catch (e) {
		return left(e.toString());
	}
}

export async function fetchJson(endpoint: RequestInfo, options: RequestInit): Promise<Either<string, any>> {
	try {
		const resp = await fetch(endpoint, options);
		const json = await resp.json();

		if (!resp.ok) {
			return left(getErrorString(resp, json));
		}
		return right(json);
	}
	catch (e) {
		return left(e.toString());
	}
}

export async function getChallenges(): Promise<Either<string, ChallengeListing[]>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson("http://localhost:5000/api/challenges", requestOptions), json => json);
}

export async function getChallenge(challenge_id: string): Promise<Either<string, ChallengeListing>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/challenge/${challenge_id}`, requestOptions), json => json);
}

export async function getInstance(instance_id: string): Promise<Either<string, ChallengeInstance>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/challenge_instance/${instance_id}`, requestOptions), json => json);
}

export async function getParticipants(instance_id: string): Promise<Either<string, ChallengeParticipant[]>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/challenge_instance/${instance_id}`, requestOptions), json => json);
}

export async function getMedia(challenge_id: string): Promise<Either<string, ChallengeMedia[]>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/get_mock_media`, requestOptions), json => json);
	// return bind(await fetchJson(`/api/challenge_media/${challenge_id}`, requestOptions), json => json);
}

export async function createInstance(challenge_id: string): Promise<Either<string, ChallengeInstance>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/create_instance/${challenge_id}`, requestOptions), json => json);
}

export async function uploadMedia(dataUri: string, instance_id: string, user_id: string): Promise<Either<string, ChallengeInstanceMedia>> {
	const requestOptions = {
		method: "POST",
		headers: defaultHeaders(),
		body: JSON.stringify({ data_uri: dataUri, user_id: user_id, instance_id: instance_id })
	};

	return bind(await fetchJson(`http://localhost:5000/api/challenge_instance_upload/${instance_id}`, requestOptions), json => json);
}

export async function pollPictures(instance_id: string): Promise<Either<string, ChallengeInstanceMedia[]>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/get_all_uploads/${instance_id}`, requestOptions), json => json);
}

export async function pollVotes(instance_id: string): Promise<Either<string, ChallengeVote[]>> {
	const requestOptions = {
		method: "GET",
		headers: defaultHeaders()
	};

	return bind(await fetchJson(`http://localhost:5000/api/get_vote_results/${instance_id}`, requestOptions), json => json);
}

export async function castVote(instance_id: string, votee_id: string): Promise<Either<string, ChallengeVote>> {
	const requestOptions = {
		method: "POST",
		headers: defaultHeaders(),
		body: JSON.stringify({ instance_id: instance_id, votee_id: votee_id })
	};

	return bind(await fetchJson(`http://localhost:5000/api/submit_vote`, requestOptions), json => json);
}

export async function getVideoToken(username: string, room: string): Promise<Either<string, string>> {
	const requestOptions = {
		method: "POST",
		headers: defaultHeaders(),
		body: JSON.stringify({
			identity: username,
			room: room
		}),
	}

	return bind(await fetchJson("http://localhost:5000/api/get_twilio_token", requestOptions), json => json.token);
}