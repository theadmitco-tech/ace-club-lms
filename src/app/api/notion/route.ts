import { NextRequest, NextResponse } from 'next/server';
import { NotionAPI } from 'notion-client';

const notion = new NotionAPI();

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  try {
    const recordMap = await notion.getPage(pageId);
    
    if (!recordMap) {
      return NextResponse.json({ error: 'Failed to fetch Notion page' }, { status: 404 });
    }

    return NextResponse.json(recordMap);
  } catch (error) {
    console.error('API Error fetching Notion data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
