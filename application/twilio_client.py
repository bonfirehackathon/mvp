from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

import os

# required for all twilio access tokens
# account_sid = 'ACxxxxxxxxxxxx'
account_sid = os.environ["TWILIO_SID"]

# api_key = 'SKxxxxxxxxxxxx'
api_key = os.environ["TWILIO_API_KEY"]

# api_secret = 'xxxxxxxxxxxxxx'
api_secret = os.environ["TWILIO_API_SECRET"]

class TwilioClient():
    def __init__(self, user, room):
        # Create access token with credentials
        self.token = AccessToken(account_sid, api_key, api_secret, identity=user)

        # Create a Video grant and add to token
        video_grant = VideoGrant(room=room)
        self.token.add_grant(video_grant)

    def get_token(self):
        return self.token.to_jwt()