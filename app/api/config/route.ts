/**
 * Config API Route
 * Exposes configuration status (never actual values) to the client
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    const accessPassword = (process.env.ACCESS_PASSWORD || process.env.NEXT_PUBLIC_ACCESS_PASSWORD || '').trim();
    const persistPassword = process.env.PERSIST_PASSWORD !== 'false';
    const subscriptionSources = (process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '').trim();

    return NextResponse.json({
        hasEnvPassword: accessPassword.length > 0,
        persistPassword,
        subscriptionSources,
    });
}

export async function POST(request: NextRequest) {
    try {
        let password = '';
        try {
            const body = await request.json();
            password = body?.password || '';
        } catch {
            password = '';
        }

        const accessPassword = (process.env.ACCESS_PASSWORD || process.env.NEXT_PUBLIC_ACCESS_PASSWORD || '').trim();

        if (!accessPassword) {
            return NextResponse.json({ valid: false, message: 'No env password set' });
        }

        const valid = (password || '').trim() === accessPassword;
        return NextResponse.json({ valid });
    } catch {
        return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
    }
}

