import Analysis from '../models/Analysis.js';
import { analyseSeoData } from '../services/geminiService.js';
import { scraperUrl } from '../services/scraperService.js';
// analyse the URL
export const analyzeUrl = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate URL
    let validUrl;

    try {
      validUrl = new URL(
        url.startsWith('http://') || url.startsWith('https://')
          ? url
          : `https://${url}`,
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Create analysis record
    const analysis = await Analysis.create({
      userId: req.userId,
      url: validUrl.href,
      status: 'processing',
    });

    console.log('Analysis created:', analysis._id);

    // Send response ONCE
    res.status(201).json({
      success: true,
      message: 'Analysis started',
      analysisId: analysis._id,
    });

    // Run scraping and AI analysis
    try {
      // Step 1: Scrape URL
      const scrapeResult = await scraperUrl(validUrl.href);

      if (!scrapeResult.success) {
        analysis.status = 'failed';
        await analysis.save();
        return;
      }

      // Step 2: Analyze with Gemini
      const aiResult = await analyseSeoData(scrapeResult.data);

      if (!aiResult.success) {
        analysis.status = 'failed';
        await analysis.save();
        return;
      }

      // Step 3: Save results
      analysis.overallScore = aiResult.data?.overallScore ?? 0;
      analysis.categories = aiResult.data?.categories ?? {};
      analysis.metaData = scrapeResult.data?.metaData ?? {};
      analysis.headings = scrapeResult.data?.headings ?? {};
      analysis.links = scrapeResult.data?.links ?? {};
      analysis.images = scrapeResult.data?.images ?? {};
      analysis.keywords = aiResult.data?.keywords ?? [];
      analysis.issues = aiResult.data?.issues ?? [];
      analysis.loadTime = scrapeResult.data?.loadTime ?? 0;
      analysis.pageSize = scrapeResult.data?.pageSize ?? 0;
      analysis.wordCount = scrapeResult.data?.wordCount ?? 0;
      analysis.status = 'completed';

      await analysis.save();

      console.log('Analysis completed:', analysis._id);
    } catch (bgError) {
      console.error('Background analysis error:', bgError.message);

      try {
        analysis.status = 'failed';
        await analysis.save();
      } catch (saveError) {
        console.error('Error updating analysis status:', saveError.message);
      }
    }
  } catch (error) {
    console.error('Error analyzing URL:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
};

// get the analysis result by ID
export const getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!analysis) {
      return res
        .status(404)
        .json({ success: false, message: 'Analysis not found' });
    }
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Get analysis error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// get all analysis for any user
export const getAnalyses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const analyses = await Analysis.find({
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-issues -keywords');

    const total = await Analysis.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      analyses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get analyses error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// delete an analysis by ID
export const deleteAnalysis = async (req, res) => {
  try {
    await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    res.json({ success: true, message: 'Analysis deleted' });
  } catch (error) {
    console.error('Delete analysis error', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
