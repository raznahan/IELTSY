import Essay from '../models/essayModel';
import User from '../models/userModel';
import { translate } from '../utils/i18n';

export async function getScoresOverTime(userId: string) {
  const essays = await Essay.find({ userId }).sort('submittedAt');
  return essays.map(essay => ({
    date: essay.submittedAt,
    score: essay.overallBandScore
  }));
}

export async function getTaskSpecificScores(userId: string) {
  const essays = await Essay.find({ userId }).sort('-submittedAt').limit(5);
  return essays.map(essay => ({
    date: essay.submittedAt,
    TR: essay.TR,
    CC: essay.CC,
    LR: essay.LR,
    GRA: essay.GRA
  }));
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