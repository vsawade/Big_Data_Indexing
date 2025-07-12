import { OAuth2Client } from 'google-auth-library'

const gmailOAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const isUserAuthorized = async (token: string) => {
  const ticket = await gmailOAuth2Client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  })
  const payload = ticket.getPayload()
  return payload?.iss?.includes('google') ?? false
}

const authService = {
  isUserAuthorized
}

export default authService
