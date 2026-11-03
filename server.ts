import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portIndex = process.argv.indexOf('--port');
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    const val = parseInt(process.argv[portIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return Number(process.env.PORT) || 3000;
}

function getHost(): string {
  const hostIndex = process.argv.indexOf('--host');
  if (hostIndex !== -1 && process.argv[hostIndex + 1]) {
    return process.argv[hostIndex + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const app = express();
const PORT = getPort();
const HOST = getHost();

app.use(cors());
app.use(express.json());

// Immediate health check routes for runners and load balancers
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
let hasApiKeyError = false;

const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Algorithmic Fallback Generator for Live Advice
function generateAlgorithmicAdvice(body: any) {
  const { player, currentBid, targetTeam, purse, minSquadSize, squadSize, pitchType } = body;
  const trueVal = player?.true_value || player?.base_price || 20000000;
  const current = typeof currentBid === 'number' && !isNaN(currentBid) && currentBid > 0
    ? currentBid
    : (player?.base_price || 20000000);
  const ratio = current / (trueVal || 1);
  const isAffordable = !purse || (purse - current >= Math.max(0, (minSquadSize || 15) - (squadSize || 0)) * 2000000);

  let recommendation: 'STRONG_BID' | 'CAUTIOUS_BID' | 'PASS_RECOMMENDED' = 'STRONG_BID';
  let tactical_reasoning = '';

  if (!isAffordable || ratio > 1.35) {
    recommendation = 'PASS_RECOMMENDED';
    tactical_reasoning = `Bid of ₹${(current / 10000000).toFixed(2)} Cr exceeds safe capital valuation (True Val: ₹${(trueVal / 10000000).toFixed(2)} Cr). Passing avoids late-draft liquidity traps.`;
  } else if (ratio > 0.88) {
    recommendation = 'CAUTIOUS_BID';
    tactical_reasoning = `Player is priced near fair market value. Recommended for ${targetTeam || 'the franchise'} only if targeting an immediate specialist void on this ${pitchType || 'Standard'} track.`;
  } else {
    recommendation = 'STRONG_BID';
    const discountPerc = Math.max(0, Math.round((1 - ratio) * 100));
    tactical_reasoning = `High-efficiency acquisition opportunity! Current price represents a ${discountPerc}% discount relative to the pitch-adjusted baseline.`;
  }

  return {
    recommendation,
    target_max_bid: Math.min(trueVal * 1.25, (purse || 1000000000) * 0.35),
    tactical_reasoning,
    pitch_synergy: `${player?.display_name || 'Player'} profile calibrated for ${pitchType || 'Standard'} playing surface.`,
    squad_fit: `Solid positional fit for ${targetTeam || 'franchise'} roster depth.`,
    isAiPowered: false,
    apiKeyNotice: hasApiKeyError,
  };
}

// Algorithmic Fallback Generator for Squad Audit
function generateAlgorithmicAudit(body: any) {
  const { teamName, roster, pitchType } = body;
  const list = roster || [];
  const batCount = list.filter((p: any) => p.role?.toLowerCase().includes('batter')).length;
  const bowlCount = list.filter((p: any) => p.role?.toLowerCase().includes('bowler')).length;
  const allCount = list.filter((p: any) => p.role?.toLowerCase().includes('all-rounder')).length;

  return {
    teamName: teamName || 'Franchise',
    overallRating: Math.min(95, Math.max(68, 70 + list.length * 2)),
    keyStrength: allCount >= 3 ? 'Deep All-Round Balance & Tail Order Batting' : 'Solid Positional Foundation',
    criticalWeakness: bowlCount < 4 ? 'Needs dedicated death-over pace options' : 'Middle-overs strike rotation',
    impactPlayerRecommendation: list[0]?.display_name || 'Designated Power Finisher',
    championshipVerdict: `Projected Playoff Contender under ${pitchType || 'Standard'} conditions.`,
    isAiPowered: false,
    apiKeyNotice: hasApiKeyError,
  };
}

// Algorithmic Fallback Generator for Season Forecast
function generateAlgorithmicForecast(body: any) {
  const { rankings, pitchType } = body;
  const champ = rankings?.[0]?.team_name || 'Champion Franchise';
  return {
    headline: `${champ} Clinches Premier Title in Tactical Simulation!`,
    orangeCapPrediction: 'Top order run machine with dominant strike-rate matrix.',
    purpleCapPrediction: 'Elite strike bowler operating across powerplay and death overs.',
    darkHorseTeam: rankings?.[1]?.team_name || 'Runner Up',
    tournamentNarrative: `${champ} dominated the competition thanks to unmatched roster depth and surgical execution on ${pitchType || 'Standard'} conditions.`,
    isAiPowered: false,
  };
}

// Endpoint 1: Live AI Strategic Auctioneer & War-Room Advice
app.post('/api/ai/live-advice', async (req: Request, res: Response) => {
  const { player, currentBid, targetTeam, purse, minSquadSize, squadSize, pitchType } = req.body;

  if (!player) {
    return res.status(400).json({ error: 'Player data is required' });
  }

  if (!ai || hasApiKeyError) {
    return res.json(generateAlgorithmicAdvice(req.body));
  }

  try {
    const prompt = `You are the Lead Data Scientist & Tactical Auction Strategist for IPL 2026.
Analyze this active live player bidding situation:
- Player: ${player.display_name} (${player.role}, ${player.country}, Age: ${player.age || 'N/A'}, 2026 Team: ${player.ipl_team_2026 || 'N/A'}, Specialization: ${player.specialization || 'N/A'})
- Stats: Bat Avg: ${player.batting_avg}, Strike Rate: ${player.batting_strike_rate}, Bowling Econ: ${player.bowling_economy}, Wickets: ${player.bowling_wickets}, Trait: "${player.career_highlight}"
- Environment: Pitch Surface = ${pitchType || 'Standard'}
- Auction State: Current Bid = ₹${(currentBid / 10000000).toFixed(2)} Cr (Base: ₹${(player.base_price / 10000000).toFixed(2)} Cr, Algorithmic True Value: ₹${((player.true_value || player.base_price) / 10000000).toFixed(2)} Cr)
- Evaluating Franchise: ${targetTeam || 'Undecided Franchise'} (Remaining Purse: ₹${purse ? (purse / 10000000).toFixed(2) : '100'} Cr, Current Squad: ${squadSize || 0}/${minSquadSize || 15})

Provide sharp, realistic, high-IQ war-room advice in JSON with:
1. "recommendation": One of "STRONG_BID", "CAUTIOUS_BID", "PASS_RECOMMENDED"
2. "target_max_bid": recommended maximum price in rupees (integer)
3. "tactical_reasoning": 1-2 sentence punchy war-room strategic advice
4. "pitch_synergy": how player traits synergize with ${pitchType || 'Standard'} surface
5. "squad_fit": how the player fits the team needs`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: {
              type: Type.STRING,
              description: 'STRONG_BID, CAUTIOUS_BID, or PASS_RECOMMENDED',
            },
            target_max_bid: {
              type: Type.INTEGER,
              description: 'Recommended maximum bid price in rupees',
            },
            tactical_reasoning: {
              type: Type.STRING,
              description: 'Crisp 1-2 sentence tactical advice',
            },
            pitch_synergy: {
              type: Type.STRING,
              description: 'Pitch track synergy explanation',
            },
            squad_fit: {
              type: Type.STRING,
              description: 'Squad construction fit assessment',
            },
          },
          required: ['recommendation', 'target_max_bid', 'tactical_reasoning', 'pitch_synergy', 'squad_fit'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      isAiPowered: true,
    });
  } catch (error: any) {
    const errorString = String(error?.message || error || '');
    if (
      errorString.includes('API_KEY_INVALID') ||
      errorString.includes('API key not valid') ||
      errorString.includes('PERMISSION_DENIED') ||
      error?.status === 400 ||
      error?.status === 403
    ) {
      hasApiKeyError = true;
    }
    return res.json(generateAlgorithmicAdvice(req.body));
  }
});

// Endpoint 2: AI Franchise Squad Audit
app.post('/api/ai/squad-audit', async (req: Request, res: Response) => {
  const { teamName, roster, pitchType, spent, purse } = req.body;

  if (!teamName || !roster) {
    return res.status(400).json({ error: 'Team name and roster are required' });
  }

  if (!ai || hasApiKeyError) {
    return res.json(generateAlgorithmicAudit(req.body));
  }

  try {
    const playerListSummary = roster
      .map((p: any) => `${p.display_name} (${p.role}, ₹${((p.sold_price || p.base_price) / 10000000).toFixed(2)}Cr, AI:${p.ai_rating})`)
      .join(', ');

    const prompt = `You are the Chief IPL Performance Analyst.
Evaluate this IPL 2026 franchise squad:
Franchise: ${teamName}
Total Players: ${roster.length}
Tournament Pitch Setting: ${pitchType || 'Standard'}
Spent: ₹${((spent || 0) / 10000000).toFixed(2)} Cr | Remaining: ₹${((purse || 0) / 10000000).toFixed(2)} Cr
Squad List: ${playerListSummary || 'Empty squad'}

Provide a professional, realistic squad audit in JSON:
1. "overallRating": score between 50 and 99
2. "keyStrength": biggest structural advantage
3. "criticalWeakness": biggest structural flaw or vulnerability
4. "impactPlayerRecommendation": ideal tactical impact player role/player
5. "championshipVerdict": 1-2 sentence forecast for tournament title chances`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRating: { type: Type.INTEGER },
            keyStrength: { type: Type.STRING },
            criticalWeakness: { type: Type.STRING },
            impactPlayerRecommendation: { type: Type.STRING },
            championshipVerdict: { type: Type.STRING },
          },
          required: ['overallRating', 'keyStrength', 'criticalWeakness', 'impactPlayerRecommendation', 'championshipVerdict'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...parsed, teamName, isAiPowered: true });
  } catch (error: any) {
    const errorString = String(error?.message || error || '');
    if (
      errorString.includes('API_KEY_INVALID') ||
      errorString.includes('API key not valid') ||
      errorString.includes('PERMISSION_DENIED') ||
      error?.status === 400 ||
      error?.status === 403
    ) {
      hasApiKeyError = true;
    }
    return res.json(generateAlgorithmicAudit(req.body));
  }
});

// Endpoint 3: AI Season Simulation & Tournament Forecast
app.post('/api/ai/season-forecast', async (req: Request, res: Response) => {
  const { rankings, pitchType } = req.body;

  if (!ai || hasApiKeyError || !rankings || rankings.length === 0) {
    return res.json(generateAlgorithmicForecast(req.body));
  }

  try {
    const rankingText = rankings
      .map((r: any, idx: number) => `#${idx + 1} ${r.team_name} (TBI: ${r.tbi_score}, Spent: ₹${(r.spent / 10000000).toFixed(2)}Cr)`)
      .join('\n');

    const prompt = `You are the lead IPL esports commentator and tournament analyst.
The IPL Mock Draft has concluded with these final algorithmic Tactical Balance Index (TBI) rankings:
Pitch Surface: ${pitchType || 'Standard'}
Standings:
${rankingText}

Produce a thrilling post-tournament forecast and awards prediction in JSON:
1. "headline": exciting sports headline summarizing the tournament champion
2. "orangeCapPrediction": predicted leading run scorer archetype & reasoning
3. "purpleCapPrediction": predicted leading wicket taker archetype & reasoning
4. "darkHorseTeam": team that could pull off massive playoff upsets
5. "tournamentNarrative": 2-3 sentence engaging analysis of why the champion roster took the crown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            orangeCapPrediction: { type: Type.STRING },
            purpleCapPrediction: { type: Type.STRING },
            darkHorseTeam: { type: Type.STRING },
            tournamentNarrative: { type: Type.STRING },
          },
          required: ['headline', 'orangeCapPrediction', 'purpleCapPrediction', 'darkHorseTeam', 'tournamentNarrative'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...parsed, isAiPowered: true });
  } catch (error: any) {
    const errorString = String(error?.message || error || '');
    if (
      errorString.includes('API_KEY_INVALID') ||
      errorString.includes('API key not valid') ||
      errorString.includes('PERMISSION_DENIED') ||
      error?.status === 400 ||
      error?.status === 403
    ) {
      hasApiKeyError = true;
    }
    return res.json(generateAlgorithmicForecast(req.body));
  }
});

// Setup Vite middleware in dev or static serve in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`IPL Esports Simulator running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
