import { NextResponse } from 'next/server';
import { getAuthUrl, isGoogleDriveConfigured } from '@/lib/googleDrive';

export async function GET() {
  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in .env.',
      },
      { status: 500 }
    );
  }
  return NextResponse.redirect(getAuthUrl());
}
