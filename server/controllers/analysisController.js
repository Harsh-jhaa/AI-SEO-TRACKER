
import Analysis from '../models/Analysis.js';
import { scraperUrl } from '../services/scraperService.js';
// analyse the URL
export const analyzeUrl = (req, res) => {
    try {
        const {url} = req.body;
        if(!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        // valid url format
        let validUrl;
        try {
            validUrl = new URL(url.startWith('http') ? url : `https://${url}`);
        } catch (error) {
            return res.status(400).json({success: false, error: 'Invalid URL format' });
        }

        // create analysis record with pending status

        const analysis = await Analysis.create({
            userId: req.userId,
            url: validUrl.href,
            status: 'processing',
        });
        res.status(201).json({ success: true, data: analysis });

        //  send immediate response with the analysis ID and status
        res.json({ success: true, message: 'Analysis started', analysisId: analysis._id });


        // Step: 1  Run scraping and analysis in the background
        try {
            const scrapeResult = await scraperUrl(validUrl.href);

            if(!scrapeResult.success) {
                analysis.status = 'failed';
                await analysis.save();
                return;
            }

            //Step: 2 Analyse with Gemini AI


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
        if(!res.headersSent) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    }
}

// get the analysis result by ID
export const getAnalysis = (req, res) => {}

// get all analysis for users
export const getAnalyses = async (req, res) => {}

// delete an analysis by ID
export const deleteAnalysis = async (req, res) => {}