import express from 'express';
import {
  deleteAnalysis,
  getAnalyses,
  getAnalysis,
  analyzeUrl,
} from '../controllers/analysisController.js';
import auth from '../middleware/auth.js';

const analysisRouter = express.Router();

analysisRouter.post('/analyze', auth, analyzeUrl);
analysisRouter.get('/list', auth, getAnalyses);
analysisRouter.get('/:id', auth, getAnalysis);
analysisRouter.delete('/:id', auth, deleteAnalysis);

export default analysisRouter;
