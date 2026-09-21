import { randomUUID } from 'crypto';
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

    // Multiple Google accounts can be connected side by side (see
    // GoogleDriveAuth in prisma/schema.prisma) -- re-authorizing an account
    // that's already connected (same email) just refreshes its tokens in
    // place, while authorizing a *different* Google account (the OAuth
    // consent screen's "select_account" prompt lets the person pick one
    // each time) adds it as a new row instead of overwriting the existing
    // one.
    const existing = email
      ? await prisma.googleDriveAuth.findFirst({ where: { email } })
      : null;

    if (existing) {
      await prisma.googleDriveAuth.update({
        where: { id: existing.id },
        data: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiryDate, email },
      });
    } else {
      await prisma.googleDriveAuth.create({
        data: {
          id: randomUUID(),
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate,
          email,
        },
      });
    }

    return NextResponse.redirect(`${origin}/?drive=connected`);
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    return NextResponse.redirect(`${origin}/?drive=error&reason=exchange_failed`);
  }
}
