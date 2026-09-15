import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForTokens, fetchUserEmail } from '@/lib/googleDrive';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const origin = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/?drive=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?drive=error&reason=missing_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Happens if the user had already granted consent before and Google
      // doesn't re-issue a refresh token. Ask them to revoke access at
      // https://myaccount.google.com/permissions and reconnect.
      return NextResponse.redirect(`${origin}/?drive=error&reason=no_refresh_token`);
    }

    const email = await fetchUserEmail(tokens.access_token);
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.googleDriveAuth.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate,
        email,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate,
        email,
      },
    });

    return NextResponse.redirect(`${origin}/?drive=connected`);
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    return NextResponse.redirect(`${origin}/?drive=error&reason=exchange_failed`);
  }
}
