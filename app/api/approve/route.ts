import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Missing validation token' }, { status: 400 })
    }

    const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
    if (!n8nUrl) {
      return NextResponse.json({ error: 'System webhook route undefined locally' }, { status: 500 })
    }

    // Binds explicitly to the standard trailing path natively requested
    const targetUrl = `${n8nUrl.replace(/\/$/, '')}/webhook/stock-approve?token=${encodeURIComponent(token)}`
    
    const response = await fetch(targetUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
       return NextResponse.json({ error: `Integration refused connection. Status: ${response.status}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (err: any) {
    console.error("Endpoint proxy failure:", err)
    return NextResponse.json({ error: err.message || 'Internal proxy bridging fault' }, { status: 500 })
  }
}
