// ============================================
// CRAWLER ROUTES - Web Page Discovery & Scraping
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, cheerio, xml2js } = require('../config');
const { generateDocumentEmbedding } = require('../services');

/**
 * Discover sitemap and pages from a website URL
 * POST /api/crawler/discover
 */
router.post('/discover', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
        const domain = parsedUrl.host;

        console.log('Discovering pages for:', baseUrl);

        const allPages = new Map();
        let sitemapFound = false;

        const sitemapUrls = [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap_index.xml`,
            `${baseUrl}/sitemap/sitemap.xml`,
            `${baseUrl}/sitemaps/sitemap.xml`,
            `${baseUrl}/wp-sitemap.xml`,
        ];

        // Check robots.txt for sitemap
        try {
            const robotsResponse = await axios.get(`${baseUrl}/robots.txt`, {
                timeout: 10000,
                headers: { 'User-Agent': 'Voicory-Crawler/1.0' }
            });

            const sitemapMatches = robotsResponse.data.match(/Sitemap:\s*(.+)/gi);
            if (sitemapMatches) {
                for (const match of sitemapMatches) {
                    const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
                    if (!sitemapUrls.includes(sitemapUrl)) {
                        sitemapUrls.unshift(sitemapUrl);
                    }
                }
            }
        } catch {
            console.log('No robots.txt found');
        }

        // Try each sitemap URL
        for (const sitemapUrl of sitemapUrls) {
            try {
                console.log('Trying sitemap:', sitemapUrl);
                const sitemapResponse = await axios.get(sitemapUrl, {
                    timeout: 15000,
                    headers: { 
                        'User-Agent': 'Voicory-Crawler/1.0',
                        'Accept': 'application/xml, text/xml, */*'
                    }
                });

                const pages = await parseSitemap(sitemapResponse.data, baseUrl);
                if (pages.length > 0) {
                    sitemapFound = true;
                    for (const page of pages) {
                        if (!allPages.has(page.url)) {
                            allPages.set(page.url, page);
                        }
                    }
                    console.log(`Found ${pages.length} pages in sitemap: ${sitemapUrl}`);
                }
            } catch {
                console.log(`Sitemap not found at: ${sitemapUrl}`);
            }
        }

        // If no sitemap, crawl homepage
        if (!sitemapFound || allPages.size === 0) {
            console.log('No sitemap found, crawling homepage for links...');
            try {
                const homepageLinks = await crawlPageForLinks(baseUrl, baseUrl);
                for (const link of homepageLinks) {
                    if (!allPages.has(link.url)) {
                        allPages.set(link.url, link);
                    }
                }
                if (!allPages.has(baseUrl)) {
                    allPages.set(baseUrl, { url: baseUrl, title: 'Homepage' });
                }
            } catch (crawlError) {
                console.error('Error crawling homepage:', crawlError.message);
            }
        }

        const pagesArray = Array.from(allPages.values())
            .filter(page => page.url.startsWith(baseUrl))
            .sort((a, b) => a.url.localeCompare(b.url))
            .slice(0, 500);

        console.log(`Discovered ${pagesArray.length} pages for ${domain}`);

        res.json({
            domain,
            baseUrl,
            pages: pagesArray,
            totalPages: pagesArray.length,
            sitemapFound
        });

    } catch (error) {
        console.error('Page discovery error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to discover pages' });
    }
});

/**
 * Crawl selected pages and extract content
 * POST /api/crawler/crawl
 */
router.post('/crawl', async (req, res) => {
    try {
        const { pages, knowledgeBaseId, documentName, userId, autoAddFuture } = req.body;

        if (!pages || !Array.isArray(pages) || pages.length === 0) {
            return res.status(400).json({ error: 'At least one page URL is required' });
        }

        if (!knowledgeBaseId || !userId) {
            return res.status(400).json({ error: 'knowledgeBaseId and userId are required' });
        }

        console.log(`Starting crawl of ${pages.length} pages for KB: ${knowledgeBaseId}`);

        const firstUrl = new URL(pages[0].url || pages[0]);
        const domain = firstUrl.host;
        const baseUrl = `${firstUrl.protocol}//${firstUrl.host}`;

        // Create URL document
        const { data: urlDocument, error: docError } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id: knowledgeBaseId,
                type: 'url',
                name: documentName || domain,
                source_url: baseUrl,
                crawl_depth: 0,
                processing_status: 'processing',
                user_id: userId,
                metadata: {
                    autoAddFuture: autoAddFuture || false,
                    totalPages: pages.length,
                    crawledAt: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (docError) {
            console.error('Error creating URL document:', docError);
            return res.status(500).json({ error: 'Failed to create document record' });
        }

        console.log('Created URL document:', urlDocument.id);

        const crawledPages = [];
        let totalCharacters = 0;
        let successCount = 0;
        let failCount = 0;

        for (const pageInfo of pages) {
            const pageUrl = typeof pageInfo === 'string' ? pageInfo : pageInfo.url;
            
            try {
                console.log('Crawling:', pageUrl);
                const pageContent = await crawlPageContent(pageUrl);

                if (pageContent.content) {
                    const { data: crawledPage, error: pageError } = await supabase
                        .from('knowledge_base_crawled_pages')
                        .insert({
                            document_id: urlDocument.id,
                            page_url: pageUrl,
                            page_title: pageContent.title,
                            content: pageContent.content,
                            character_count: pageContent.content.length,
                            crawl_status: 'completed',
                            http_status_code: 200,
                            metadata: {
                                description: pageContent.description,
                                wordCount: pageContent.wordCount,
                                headings: pageContent.headings?.slice(0, 10)
                            },
                            crawled_at: new Date().toISOString(),
                            user_id: userId
                        })
                        .select()
                        .single();

                    if (!pageError && crawledPage) {
                        crawledPages.push(crawledPage);
                        totalCharacters += pageContent.content.length;
                        successCount++;
                    }
                } else {
                    await supabase
                        .from('knowledge_base_crawled_pages')
                        .insert({
                            document_id: urlDocument.id,
                            page_url: pageUrl,
                            crawl_status: 'failed',
                            crawl_error: 'No content extracted',
                            crawled_at: new Date().toISOString(),
                            user_id: userId
                        });
                    failCount++;
                }

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (crawlError) {
                console.error(`Error crawling ${pageUrl}:`, crawlError.message);
                await supabase
                    .from('knowledge_base_crawled_pages')
                    .insert({
                        document_id: urlDocument.id,
                        page_url: pageUrl,
                        crawl_status: 'failed',
                        crawl_error: crawlError.message,
                        http_status_code: crawlError.response?.status || null,
                        crawled_at: new Date().toISOString(),
                        user_id: userId
                    });
                failCount++;
            }
        }

        const combinedContent = crawledPages
            .map(p => `${p.page_title || ''}\n${p.content || ''}`)
            .join('\n\n')
            .slice(0, 8000);
        
        const { data: updatedDoc } = await supabase
            .from('knowledge_base_documents')
            .update({
                processing_status: failCount === pages.length ? 'failed' : 'completed',
                character_count: totalCharacters,
                content: combinedContent,
                last_crawled_at: new Date().toISOString(),
                metadata: {
                    ...urlDocument.metadata,
                    successCount,
                    failCount,
                    totalCharacters,
                    crawledPagesCount: successCount
                }
            })
            .eq('id', urlDocument.id)
            .select()
            .single();

        console.log(`Crawl complete: ${successCount} success, ${failCount} failed`);
        
        // Generate embedding async
        if (combinedContent.length > 10) {
            generateDocumentEmbedding(urlDocument.id, combinedContent)
                .then(result => {
                    if (result) console.log('Document embedding generated successfully');
                })
                .catch(err => console.error('Background embedding failed:', err));
        }

        res.json({
            success: true,
            document: updatedDoc || urlDocument,
            stats: { totalPages: pages.length, successCount, failCount, totalCharacters },
            crawledPages: crawledPages.map(p => ({
                id: p.id,
                url: p.page_url,
                title: p.page_title,
                characterCount: p.character_count
            }))
        });

    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: error.message || 'Failed to crawl pages' });
    }
});

// Helper: Parse sitemap XML
async function parseSitemap(xmlData, baseUrl) {
    const pages = [];
    
    try {
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlData);

        if (result.sitemapindex?.sitemap) {
            const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
                ? result.sitemapindex.sitemap 
                : [result.sitemapindex.sitemap];

            for (const sitemap of sitemaps.slice(0, 10)) {
                const sitemapLoc = sitemap.loc;
                if (sitemapLoc) {
                    try {
                        const subResponse = await axios.get(sitemapLoc, {
                            timeout: 10000,
                            headers: { 'User-Agent': 'Voicory-Crawler/1.0' }
                        });
                        const subPages = await parseSitemap(subResponse.data, baseUrl);
                        pages.push(...subPages);
                    } catch {
                        console.log('Error fetching sub-sitemap:', sitemapLoc);
                    }
                }
            }
        }

        if (result.urlset?.url) {
            const urls = Array.isArray(result.urlset.url) 
                ? result.urlset.url 
                : [result.urlset.url];

            for (const urlEntry of urls) {
                const url = urlEntry.loc;
                if (url) {
                    pages.push({
                        url,
                        lastmod: urlEntry.lastmod || null,
                        priority: urlEntry.priority || null,
                        changefreq: urlEntry.changefreq || null
                    });
                }
            }
        }
    } catch (parseError) {
        console.error('XML parse error:', parseError.message);
    }

    return pages;
}

// Helper: Crawl page for internal links
async function crawlPageForLinks(pageUrl, baseUrl) {
    const links = [];

    try {
        const response = await axios.get(pageUrl, {
            timeout: 15000,
            headers: { 
                'User-Agent': 'Voicory-Crawler/1.0',
                'Accept': 'text/html,application/xhtml+xml'
            },
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        $('a[href]').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim() || $(el).attr('title');

            if (href) {
                try {
                    let absoluteUrl;
                    if (href.startsWith('http')) {
                        absoluteUrl = href;
                    } else if (href.startsWith('/')) {
                        absoluteUrl = new URL(href, baseUrl).href;
                    } else if (!href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
                        absoluteUrl = new URL(href, pageUrl).href;
                    }

                    if (absoluteUrl && absoluteUrl.startsWith(baseUrl)) {
                        const cleanUrl = absoluteUrl.split('#')[0].split('?')[0];
                        if (!cleanUrl.match(/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|mp3|ico)$/i)) {
                            links.push({
                                url: cleanUrl,
                                title: title?.substring(0, 100) || null
                            });
                        }
                    }
                } catch {
                    // Invalid URL
                }
            }
        });
    } catch (crawlError) {
        console.error('Error crawling page for links:', crawlError.message);
    }

    const seen = new Set();
    return links.filter(link => {
        if (seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
    });
}

// Helper: Extract content from a page
async function crawlPageContent(url) {
    const response = await axios.get(url, {
        timeout: 30000,
        headers: {
            'User-Agent': 'Voicory-Crawler/1.0 (+https://voicory.com)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .nav, .menu, .footer, .header, .advertisement, .ads, .social-share, .cookie-notice, .popup, #cookie-banner, .comments, form').remove();

    const title = $('title').first().text().trim() ||
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') || '';

    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';

    const headings = [];
    $('h1, h2, h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) {
            headings.push({ level: el.tagName.toLowerCase(), text });
        }
    });

    let mainContent = '';
    const contentSelectors = [
        'main', 'article', '[role="main"]', '.content', '.post-content',
        '.entry-content', '.article-content', '.page-content', '#content', '.main-content'
    ];

    for (const selector of contentSelectors) {
        const el = $(selector);
        if (el.length) {
            mainContent = el.text().trim();
            if (mainContent.length > 100) break;
        }
    }

    if (!mainContent || mainContent.length < 100) {
        mainContent = $('body').text().trim();
    }

    mainContent = mainContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
    const wordCount = mainContent.split(/\s+/).filter(w => w.length > 0).length;

    return {
        title: title.substring(0, 500),
        description: description.substring(0, 500),
        content: mainContent,
        headings,
        wordCount,
        characterCount: mainContent.length
    };
}

module.exports = router;
