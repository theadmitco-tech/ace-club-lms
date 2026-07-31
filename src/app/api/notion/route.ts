import { NextRequest, NextResponse } from 'next/server';
import { NotionAPI } from 'notion-client';
import { extractNotionPageId } from '@/lib/notion';
import { createClient } from '@/utils/supabase/server';

const notion = new NotionAPI();

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const requestedPageId = searchParams.get('pageId');

  if (!requestedPageId) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  const pageId = extractNotionPageId(requestedPageId);
  if (!pageId) {
    return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Notion authorization profile lookup failed:', profileError);
      return NextResponse.json({ error: 'Unable to verify authorization' }, { status: 500 });
    }

    if (!profile?.is_active) {
      return NextResponse.json({ error: 'Active account required' }, { status: 403 });
    }

    const { data: materials, error: materialError } = await supabase
      .from('materials')
      .select('notion_url')
      .not('notion_url', 'is', null);

    if (materialError) {
      console.error('Notion material authorization failed:', materialError);
      return NextResponse.json({ error: 'Unable to verify material access' }, { status: 500 });
    }

    const canReadPage = materials.some(
      (material) =>
        typeof material.notion_url === 'string' &&
        extractNotionPageId(material.notion_url) === pageId,
    );

    if (!canReadPage) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

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
