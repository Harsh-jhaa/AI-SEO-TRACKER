import { rankTracker } from './rankTrackerService.js';

export async function keywordTracking(tracking) {
  console.log('Refreshing:', tracking.keyword);

  try {
    let result;

    // Try up to 2 times for reliable results
    for (let attempt = 1; attempt <= 2; attempt++) {
      result = await rankTracker(tracking.keyword, tracking.domain);

     

      if (result.success && result.data.totalResultsScanned > 0) {
        break;
      }

      if (attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, result.success ? 3000 : 5000),
        );
      }
    }

    if (result.success) {
      const prev = tracking.currentPosition;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only update ranking if a valid position was found
      if (result.data.position !== null && result.data.position !== undefined) {
        tracking.currentPosition = result.data.position;
        tracking.currentPage = result.data.page;
        tracking.competitors = result.data.competitors;

        // Update position change
        tracking.positionChange =
          prev && result.data.position ? prev - result.data.position : 0;

        // Update best position
        if (
          !tracking.bestPosition ||
          result.data.position < tracking.bestPosition
        ) {
          tracking.bestPosition = result.data.position;
        }

        // Update rank history
        const historyEntry = {
          date: today,
          position: result.data.position,
          page: result.data.page,
          title: result.data.title,
          snippet: result.data.snippet,
        };

        const idx = tracking.rankHistory.findIndex(
          (h) => h.date.toDateString() === today.toDateString(),
        );

        if (idx >= 0) {
          tracking.rankHistory[idx] = historyEntry;
        } else {
          tracking.rankHistory.push(historyEntry);
        }
      } else {
        console.log(
          'No ranking found. Keeping previous position and competitors.',
        );
      }

      // Always update these
      tracking.lastChecked = new Date();
      tracking.status = 'completed';

      await tracking.save();
    } else {
      tracking.status = 'failed';
      await tracking.save();
    }

    return result;
  } catch (error) {
    console.error('Rank update error:', error.message);

    tracking.status = 'failed';

    await tracking.save().catch(() => {});

    return {
      success: false,
      message: 'Server error',
    };
  }
}
