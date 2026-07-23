/**
 * Config API Route
 * Exposes configuration status (never actual values) to the client
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const accessPassword = process.env.ACCESS_PASSWORD || '';
    const persistPassword = process.env.PERSIST_PASSWORD !== 'false';
    const subscriptionSources = process.env.SUBSCRIPTION_SOURCES || process.env.NEXT_PUBLIC_SUBSCRIPTION_SOURCES || '';

    return NextResponse.json({
        hasEnvPassword: accessPassword.length > 0,
        persistPassword,
        subscriptionSources,
    });
}

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const accessPassword = process.env.ACCESS_PASSWORD || '';

        if (!accessPassword) {
            return NextResponse.json({ valid: false, message: 'No env password set' });
        }

        const valid = password === accessPassword;
        return NextResponse.json({ valid });
    } catch {
        return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400 });
    }
}

