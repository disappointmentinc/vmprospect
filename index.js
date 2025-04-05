// index.js - Main entry point for the Prospecting Tool PWA

// Import necessary dependences
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize Supabase client for data storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const PORT = process.env.PORT || 3000;

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Run all analysis in parallel
    const [
      lighthouseResults,
      siteInfo,
      lastUpdated,
      competitorInfo
    ] = await Promise.all([
      runLighthouseAnalysis(url),
      getSiteInfo(url),
      getLastUpdated(url),
      getCompetitorInfo(url)
    ]);

    // Calculate overall score based on various factors
    const overallScore = calculateOverallScore(lighthouseResults, siteInfo, lastUpdated);

    // Generate recommendations based on scores
    const recommendations = generateRecommendations(lighthouseResults, siteInfo, lastUpdated);

    // Save analysis to database
    await saveAnalysisToDatabase(url, {
      lighthouseResults,
      siteInfo,
      lastUpdated,
      competitorInfo,
      overallScore,
      recommendations,
      timestamp: new Date().toISOString()
    });

    res.json({
      url,
      overallScore,
      lighthouseResults,
      siteInfo,
      lastUpdated,
      competitorInfo,
      recommendations
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze website', details: error.message });
  }
});

// History endpoint - get previous analyses
app.get('/api/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('url, overallScore, timestamp')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to retrieve history', details: error.message });
  }
});

// Get detailed analysis for a specific URL
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Analysis retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis', details: error.message });
  }
});

// Helper functions
async function runLighthouseAnalysis(url) {
  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });

  try {
    // Run Lighthouse
    const options = {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    const results = await lighthouse(url, options);
    const report = results.lhr;

    // Extract the scores
    const scores = {
      performance: report.categories.performance.score * 100,
      accessibility: report.categories.accessibility.score * 100,
      bestPractices: report.categories['best-practices'].score * 100,
      seo: report.categories.seo.score * 100,
      // Extract mobile-friendliness
      mobileFriendly: report.audits['content-width'].score === 1
    };

    // Extract key metrics for detailed analysis
    const metrics = {
      firstContentfulPaint: report.audits['first-contentful-paint'].displayValue,
      largestContentfulPaint: report.audits['largest-contentful-paint'].displayValue,
      totalBlockingTime: report.audits['total-blocking-time'].displayValue,
      cumulativeLayoutShift: report.audits['cumulative-layout-shift'].displayValue,
      speedIndex: report.audits['speed-index'].displayValue
    };

    // Extract SEO specifics
    const seoDetails = {
      hasViewport: report.audits['viewport'].score === 1,
      hasMeta: report.audits['meta-description'].score === 1,
      hasTitle: report.audits['document-title'].score === 1,
      hasHreflang: report.audits['hreflang'].score === 1,
      hasCanonical: report.audits['canonical'].score === 1,
      robotsTxt: report.audits['robots-txt'].score === 1
    };

    return {
      scores,
      metrics,
      seoDetails
    };
  } finally {
    // Always close Chrome
    await chrome.kill();
  }
}

async function getSiteInfo(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract useful information
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    
    // Count the number of images and if they have alt text
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    
    // Count links (internal vs external)
    const allLinks = $('a').length;
    const domain = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;
    
    $('a[href]').each((i, link) => {
      const href = $(link).attr('href');
      if (!href.startsWith('http') || href.includes(domain)) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    });
    
    // Analyze content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').length;
    
    // Check for structured data
    const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
    
    // Check for social media presence
    const socialLinks = {
      facebook: $('a[href*="facebook.com"]').length > 0,
      twitter: $('a[href*="twitter.com"]').length > 0 || $('a[href*="x.com"]').length > 0,
      linkedin: $('a[href*="linkedin.com"]').length > 0,
      instagram: $('a[href*="instagram.com"]').length > 0
    };
    
    return {
      title,
      description,
      keywords,
      images,
      imagesWithAlt,
      allLinks,
      internalLinks,
      externalLinks,
      wordCount,
      hasStructuredData,
      socialLinks
    };
  } catch (error) {
    console.error('Error getting site info:', error);
    return {
      error: 'Failed to get site info',
      details: error.message
    };
  }
}

async function getLastUpdated(url) {
  try {
    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Get HTTP headers
    await page.goto(url, { waitUntil: 'networkidle2' });
    const headers = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0].responseHeaders;
    });
    
    // Check for Last-Modified header
    let lastModified = headers ? headers['last-modified'] : null;
    
    // Check sitemap.xml for last modified date
    let sitemapDate = null;
    try {
      const urlObj = new URL(url);
      const sitemapUrl = `${urlObj.protocol}//${urlObj.hostname}/sitemap.xml`;
      await page.goto(sitemapUrl, { waitUntil: 'networkidle2' });
      const sitemapContent = await page.content();
      
      // Parse sitemap for lastmod
      const $ = cheerio.load(sitemapContent, { xmlMode: true });
      $('url').each((i, el) => {
        const loc = $(el).find('loc').text();
        if (loc === url) {
          sitemapDate = $(el).find('lastmod').text();
        }
      });
    } catch (e) {
      console.log('No sitemap found or error parsing sitemap');
    }
    
    // Check page content for dates
    await page.goto(url, { waitUntil: 'networkidle2' });
    const contentDates = await page.evaluate(() => {
      // Look for HTML time elements, published dates, or modified dates
      const dates = [];
      const timeElements = document.querySelectorAll('time');
      timeElements.forEach(time => {
        if (time.dateTime) dates.push(time.dateTime);
      });
      
      // Check meta tags
      const publishedTime = document.querySelector('meta[property="article:published_time"]');
      if (publishedTime) dates.push(publishedTime.content);
      
      const modifiedTime = document.querySelector('meta[property="article:modified_time"]');
      if (modifiedTime) dates.push(modifiedTime.content);
      
      return dates;
    });
    
    await browser.close();
    
    // Determine the most recent date
    const dates = [
      lastModified ? new Date(lastModified) : null,
      sitemapDate ? new Date(sitemapDate) : null,
      ...contentDates.map(d => new Date(d))
    ].filter(d => d && !isNaN(d.getTime()));
    
    if (dates.length === 0) {
      return { 
        found: false,
        estimatedAge: 'unknown'
      };
    }
    
    const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
    const ageInDays = Math.floor((new Date() - mostRecent) / (1000 * 60 * 60 * 24));
    
    return {
      found: true,
      lastUpdated: mostRecent.toISOString(),
      ageInDays: ageInDays,
      source: lastModified ? 'HTTP headers' : (sitemapDate ? 'Sitemap' : 'Content')
    };
  } catch (error) {
    console.error('Error getting last updated:', error);
    return {
      found: false,
      error: error.message
    };
  }
}

async function getCompetitorInfo(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // For a real implementation, this would use a service like SEMrush or Ahrefs API
    // Here we'll return some sample data
    
    // Top keywords (would come from an API)
    const keywords = [
      { keyword: 'sample keyword 1', position: 4, volume: 1200 },
      { keyword: 'sample keyword 2', position: 8, volume: 800 },
      { keyword: 'sample keyword 3', position: 12, volume: 500 }
    ];
    
    // Competitors (would come from an API)
    const competitors = [
      { domain: 'competitor1.com', commonKeywords: 45, score: 85 },
      { domain: 'competitor2.com', commonKeywords: 32, score: 72 },
      { domain: 'competitor3.com', commonKeywords: 28, score: 68 }
    ];
    
    // Use puppeteer to get some basic information from the top competitors
    const competitorDetails = [];
    for (const competitor of competitors) {
      competitorDetails.push({
        domain: competitor.domain,
        commonKeywords: competitor.commonKeywords,
        score: competitor.score
      });
    }
    
    return {
      keywords,
      competitors: competitorDetails
    };
  } catch (error) {
    console.error('Error getting competitor info:', error);
    return {
      error: 'Failed to get competitor info',
      details: error.message
    };
  }
}

function calculateOverallScore(lighthouseResults, siteInfo, lastUpdated) {
  // The weights for each category
  const weights = {
    performance: 0.25,
    seo: 0.25,
    content: 0.15,
    freshness: 0.20,
    mobileFriendly: 0.15
  };
  
  // Performance score (from Lighthouse)
  const performanceScore = lighthouseResults.scores.performance;
  
  // SEO score (from Lighthouse with some adjustments)
  const seoBase = lighthouseResults.scores.seo;
  const seoBonus = (
    (siteInfo.hasStructuredData ? 5 : 0) +
    (lighthouseResults.seoDetails.hasMeta ? 5 : 0) +
    (lighthouseResults.seoDetails.hasTitle ? 5 : 0)
  ) / 3;
  const seoScore = Math.min(100, seoBase + seoBonus);
  
  // Content score - based on word count, image alt text, etc.
  const contentScore = Math.min(100, (
    (siteInfo.wordCount > 500 ? 30 : (siteInfo.wordCount / 500 * 30)) +
    (siteInfo.imagesWithAlt / Math.max(1, siteInfo.images) * 30) +
    (siteInfo.internalLinks > 10 ? 20 : siteInfo.internalLinks / 10 * 20) +
    (Object.values(siteInfo.socialLinks).filter(v => v).length / 4 * 20)
  ));
  
  // Freshness score - based on last updated date
  let freshnessScore = 50; // Default if unknown
  if (lastUpdated.found) {
    if (lastUpdated.ageInDays < 7) {
      freshnessScore = 100;
    } else if (lastUpdated.ageInDays < 30) {
      freshnessScore = 90;
    } else if (lastUpdated.ageInDays < 90) {
      freshnessScore = 75;
    } else if (lastUpdated.ageInDays < 180) {
      freshnessScore = 60;
    } else if (lastUpdated.ageInDays < 365) {
      freshnessScore = 40;
    } else {
      freshnessScore = 20;
    }
  }
  
  // Mobile-friendly score
  const mobileFriendlyScore = lighthouseResults.scores.mobileFriendly ? 100 : 30;
  
  // Calculate weighted average
  const overallScore = Math.round(
    (performanceScore * weights.performance) +
    (seoScore * weights.seo) +
    (contentScore * weights.content) +
    (freshnessScore * weights.freshness) +
    (mobileFriendlyScore * weights.mobileFriendly)
  );
  
  return {
    overall: overallScore,
    breakdown: {
      performance: {
        score: performanceScore,
        weight: weights.performance
      },
      seo: {
        score: seoScore,
        weight: weights.seo
      },
      content: {
        score: contentScore,
        weight: weights.content
      },
      freshness: {
        score: freshnessScore,
        weight: weights.freshness
      },
      mobileFriendly: {
        score: mobileFriendlyScore,
        weight: weights.mobileFriendly
      }
    }
  };
}

function generateRecommendations(lighthouseResults, siteInfo, lastUpdated) {
  const recommendations = [];
  
  // Performance recommendations
  if (lighthouseResults.scores.performance < 70) {
    recommendations.push({
      category: 'performance',
      priority: lighthouseResults.scores.performance < 50 ? 'high' : 'medium',
      title: 'Improve website performance',
      description: `The site's performance score is ${lighthouseResults.scores.performance}/100, which may lead to poor user experience and lower search rankings.`,
      details: [
        lighthouseResults.metrics.largestContentfulPaint > '2.5s' 
          ? 'Largest Contentful Paint is too slow (should be under 2.5s)' 
          : null,
        lighthouseResults.metrics.totalBlockingTime > '300ms' 
          ? 'Total Blocking Time is too high (should be under 300ms)' 
          : null,
        lighthouseResults.metrics.cumulativeLayoutShift > '0.1' 
          ? 'Cumulative Layout Shift is too high (should be under 0.1)'
          : null
      ].filter(Boolean)
    });
  }
  
  // SEO recommendations
  if (lighthouseResults.scores.seo < 90) {
    recommendations.push({
      category: 'seo',
      priority: 'high',
      title: 'Improve SEO fundamentals',
      description: 'The site is missing important SEO elements that can improve search visibility.',
      details: [
        !lighthouseResults.seoDetails.hasMeta ? 'Missing meta description' : null,
        !lighthouseResults.seoDetails.hasTitle ? 'Missing or inadequate page title' : null,
        !lighthouseResults.seoDetails.hasViewport ? 'Missing viewport meta tag' : null,
        !siteInfo.hasStructuredData ? 'No structured data/schema markup found' : null
      ].filter(Boolean)
    });
  }
  
  // Content recommendations
  if (siteInfo.wordCount < 500) {
    recommendations.push({
      category: 'content',
      priority: 'medium',
      title: 'Enhance content depth',
      description: 'The site has limited content which may affect its authority and ranking potential.',
      details: [
        `Current word count is approximately ${siteInfo.wordCount} words`,
        'Search engines typically favor comprehensive content (1000+ words for key pages)'
      ]
    });
  }
  
  // Image optimization
  if (siteInfo.images > 0 && siteInfo.imagesWithAlt / siteInfo.images < 0.8) {
    recommendations.push({
      category: 'accessibility',
      priority: 'medium',
      title: 'Add alt text to images',
      description: 'Many images on the site lack alternative text, which affects accessibility and SEO.',
      details: [
        `${siteInfo.imagesWithAlt} out of ${siteInfo.images} images have alt text`,
        'Alt text helps search engines understand image content and improves accessibility for screen reader users'
      ]
    });
  }
  
  // Freshness recommendations
  if (lastUpdated.found && lastUpdated.ageInDays > 180) {
    recommendations.push({
      category: 'freshness',
      priority: lastUpdated.ageInDays > 365 ? 'high' : 'medium',
      title: 'Update website content',
      description: 'The site content appears to be outdated, which may negatively impact user trust and search rankings.',
      details: [
        `Last content update was approximately ${lastUpdated.ageInDays} days ago`,
        'Fresh content signals to search engines that the site is actively maintained',
        'Consider regular content updates or adding a blog section'
      ]
    });
  }
  
  // Mobile-friendliness recommendation
  if (!lighthouseResults.scores.mobileFriendly) {
    recommendations.push({
      category: 'mobile',
      priority: 'high',
      title: 'Improve mobile experience',
      description: 'The site is not fully mobile-friendly, which can significantly impact rankings and user experience.',
      details: [
        'Google primarily uses mobile-first indexing',
        'Ensure content is properly sized for mobile screens',
        'Implement responsive design principles'
      ]
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityValues = { high: 3, medium: 2, low: 1 };
    return priorityValues[b.priority] - priorityValues[a.priority];
  });
}

async function saveAnalysisToDatabase(url, analysisData) {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .insert([{
        url,
        analysis: analysisData,
        overallScore: analysisData.overallScore.overall,
        timestamp: analysisData.timestamp
      }]);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database save error:', error);
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});