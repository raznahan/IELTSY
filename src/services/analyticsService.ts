import Essay from '../models/essayModel';
import User from '../models/userModel';
import { translate } from '../utils/i18n';

export async function getScoresOverTime(userId: string) {
  const essays = await Essay.find({ 
    userId, 
    overallBandScore: { $exists: true, $ne: null, $gt: 0 } 
  }).sort('submittedAt');

  return essays.map(essay => ({
    date: essay.submittedAt,
    score: essay.overallBandScore
  }));
}

export async function getTaskSpecificScoresOverTime(userId: string) {
  const essays = await Essay.find({ 
    userId,
    $and: [
      { TR: { $exists: true, $ne: null, $gt: 0 } },
      { CC: { $exists: true, $ne: null, $gt: 0 } },
      { LR: { $exists: true, $ne: null, $gt: 0 } },
      { GRA: { $exists: true, $ne: null, $gt: 0 } }
    ]
  }).sort('submittedAt');

  return essays.map(essay => ({
    date: essay.submittedAt,
    TR: essay.TR,
    CC: essay.CC,
    LR: essay.LR,
    GRA: essay.GRA
  }));
}

export async function getComparativeAnalysis(userId: string) {
  const user = await User.findOne({ telegramId: userId });
  if (!user || !user.targetScores) {
    return null;
  }

  const latestEssay = await Essay.findOne({ userId }).sort('-submittedAt');
  if (!latestEssay) {
    return null;
  }

  return {
    labels: ['TR', 'CC', 'LR', 'GRA', 'Overall'],
    datasets: [
      {
        label: 'Target Scores',
        data: [
          user.targetScores.TR,
          user.targetScores.CC,
          user.targetScores.LR,
          user.targetScores.GRA,
          user.targetScores.overall
        ]
      },
      {
        label: 'Latest Scores',
        data: [
          latestEssay.TR,
          latestEssay.CC,
          latestEssay.LR,
          latestEssay.GRA,
          latestEssay.overallBandScore
        ]
      }
    ]
  };
}

export async function getErrorHeatmap(userId: string) {
  const essays = await Essay.find({ userId });
  const errorCounts: { [key: string]: string[] } = {
    TR: [], CC: [], LR: [], GRA: []
  };

  essays.forEach(essay => {
    if (essay.errors && Array.isArray(essay.errors)) {
      essay.errors.forEach(error => {
        if (error.criterion && error.error_type) {
          const category = error.criterion.toUpperCase();
          if (errorCounts.hasOwnProperty(category)) {
            const errorString = `${error.criterion}: ${error.error_type}`;
            if (!errorCounts[category].includes(errorString)) {
              errorCounts[category].push(errorString);
            }
          }
        }
      });
    }
  });

  return errorCounts;
}

export async function checkMilestones(userId: string, newScore: number, language: string) {
  const user = await User.findOne({ telegramId: userId });
  if (!user) return null;

  const messages = [];

  if (newScore > (user.targetScores?.overall ?? 0)) {
    messages.push(translate('MILESTONE_OVERALL', language, { score: newScore.toString() }));
    user.targetScores = {
      TR: user.targetScores?.TR ?? 0,
      CC: user.targetScores?.CC ?? 0,
      LR: user.targetScores?.LR ?? 0,
      GRA: user.targetScores?.GRA ?? 0,
      overall: Math.ceil(newScore)
    };
  }

  // Similar checks for TR, CC, LR, GRA...

  if (messages.length > 0) {
    await user.save();
  }

  return messages;
}