import crypto from 'crypto';
import type { AppRepositories } from '../repositories/types.ts';
import { nowIso } from '../utils/date.ts';
import { createSessionToken } from './authService.ts';

export const DEMO_SESSION_TOKEN = 'demo_session_token_learning_progress_architect';

export async function provisionDemoSession(
  repositories: AppRepositories,
  options: { isGuest?: boolean; reset?: boolean } = {},
) {
  const { authSessions, workspace, workflow, tasks, sessions, reviews, quickActions } = repositories;
  const isGuest = options.isGuest ?? false;
  const reset = options.reset ?? false;

  let user;
  const createdAt = nowIso();

  if (isGuest) {
    const guestId = crypto.randomUUID();
    const guestSuffix = crypto.randomBytes(3).toString('hex');
    user = await authSessions.createUser({
      id: guestId,
      name: 'Guest Learner',
      email: `guest_${guestSuffix}@demo.local`,
      passwordHash: 'guest_session_hash',
      createdAt,
    });
  } else {
    const existing = await authSessions.findUserByEmail('demo@learningprogress.app');
    if (existing) {
      user = {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        created_at: existing.created_at,
      };
    } else {
      const demoId = crypto.randomUUID();
      user = await authSessions.createUser({
        id: demoId,
        name: 'Demo Learner',
        email: 'demo@learningprogress.app',
        passwordHash: 'demo_session_hash',
        createdAt,
      });
    }
  }

  const workspaceData = await workspace.getWorkspaceData(user);
  if (workspaceData.goals.length === 0 || reset) {
    const goalTitle = 'IELTS Academic: Band 7.5+ Preparation';
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const taskDefs = [
      {
        title: 'IELTS Writing Task 2: High-Scoring Essay Structure & Coherence',
        description: 'Master the 4-paragraph essay template (Introduction, Body 1, Body 2, Conclusion) for Agree/Disagree and Discussion prompts with clear cohesive linkers.',
        searchQuery: 'IELTS Writing Task 2 essay structure band 7.5 guide',
        references: [
          {
            title: 'Official Cambridge IELTS Essay Band Descriptors',
            url: 'https://www.ielts.org/for-test-takers/how-ielts-is-scored',
            snippet: 'Detailed rubric for Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range.',
            source: 'Cambridge IELTS',
          },
        ],
      },
      {
        title: 'IELTS Speaking Part 2 & 3: Fluency, Discourse Markers & Idiomatic Collocations',
        description: 'Practice delivering 2-minute cue card monologues and answering abstract follow-up questions using high-band discourse markers and natural collocations.',
        searchQuery: 'IELTS Speaking Part 2 cue card high band techniques',
        references: [
          {
            title: 'IELTS Speaking Band 7+ Collocations and Connectors',
            url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/speaking-practice-tests',
            snippet: 'Common discourse markers, topic-specific collocations, and pronunciation tips.',
            source: 'British Council',
          },
        ],
      },
      {
        title: 'IELTS Reading: True/False/Not Given & Paragraph Matching Strategies',
        description: 'Develop speed-skimming and keyword synonym recognition to accurately distinguish between False (contradicted) and Not Given (unmentioned) statements.',
        searchQuery: 'IELTS Reading True False Not Given strategies',
        references: [
          {
            title: 'Cambridge IELTS Academic Reading Question Guide',
            url: 'https://www.cambridgeenglish.org/exams-and-tests/ielts/',
            snippet: 'Techniques for skimming, scanning, and identifying paraphrased synonyms under time pressure.',
            source: 'Cambridge Assessment',
          },
        ],
      },
      {
        title: 'IELTS Listening Section 4: Academic Lecture Note-Taking & Distractor Traps',
        description: 'Train active listening for continuous academic lectures in Section 4. Learn to spot verbal signposts and ignore self-correction distractors.',
        searchQuery: 'IELTS Listening Section 4 lecture note taking distractors',
        references: [
          {
            title: 'IELTS Listening Section 4 Academic Lecture Guide',
            url: 'https://ielts.idp.com/prepare/article-ielts-listening-tips',
            snippet: 'Strategies for predicting word form, spelling accuracy, and spotting speaker signposting.',
            source: 'IDP Education',
          },
        ],
      },
    ];

    const todayDate = new Date().toISOString().slice(0, 10);
    const scheduledEvents = [
      { date: todayDate, duration: 45 },
      { date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 60 },
      { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 45 },
      { date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), duration: 60 },
    ];

    await workflow.persistGeneratedWorkflow({
      userId: user.id,
      goal: goalTitle,
      level: 'Intermediate',
      hours: 6,
      targetDate,
      preferredStyle: 'Practice-Heavy',
      resourceMode: 'needs_plan',
      planSummary: 'A high-yield preparation roadmap focusing on IELTS Academic Writing Task 2 structure, Speaking fluency, Listening Section 4 note-taking, and Reading skimming techniques.',
      resourceNote: 'Essential IELTS preparation materials covering Cambridge practice tests, essay templates, and speaking criteria.',
      resources: [],
      tasks: taskDefs,
      scheduledEvents,
      createdAt,
    });

    const refreshed = await workspace.getWorkspaceData(user);
    const firstTask = refreshed.tasks.find((t) => t.title.includes('Writing Task 2'));
    const secondTask = refreshed.tasks.find((t) => t.title.includes('Speaking Part 2'));

    if (firstTask) {
      await tasks.markCompleted(firstTask.id, user.id, createdAt);
      await sessions.createCompletedSession({
        userId: user.id,
        taskId: firstTask.id,
        durationSeconds: 2700,
        reflection: 'Learned how to write a concise 2-sentence introduction with a clear thesis statement and paraphrase the prompt accurately without repeating vocabulary.',
        confusion: 'Need more practice developing concrete supporting examples for abstract social topic essays in under 40 minutes.',
        confidence: 4,
        completedAt: createdAt,
      });

      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await reviews.create({
        userId: user.id,
        taskId: firstTask.id,
        dueDate,
        priority: 'high',
        status: 'pending',
      });
    }

    if (secondTask) {
      await tasks.markInProgress(secondTask.id, user.id);
      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'explain',
        content: `**Core Concept: Fluency & Coherence in IELTS Speaking**

1. **The 2-Minute Arc (Part 2):** Use the PPF framework (Past, Present, Future) to organize your response so you never run out of ideas before the 2-minute mark.
2. **High-Band Discourse Markers:** Replace generic fillers ('like', 'um', 'you know') with signposting language: *"To put it into perspective...", "From what I recall...", "If my memory serves me correctly..."*
3. **Lexical Resource:** Aim for natural collocations (*"heavily influenced"*, *"profound impact"*, *"vividly remember"*) rather than shoehorning obscure, archaic words.`,
        createdAt,
        updatedAt: createdAt,
      });

      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'example',
        content: `**Band 8 Sample Response for Cue Card: "Describe a memorable journey"**

> *"If my memory serves me correctly, one journey that left an indelible mark on me was a solo backpacking trip across Kyoto two summers ago. At that point in time, I had been grappling with work burnout, so I decided to take a spontaneous hiatus.*
>
> *What stood out most was the tranquil atmosphere of the bamboo groves at dawn. Looking back with hindsight, that trip fundamentally reshaped my perspective on work-life balance..."*`,
        createdAt,
        updatedAt: createdAt,
      });

      await quickActions.save({
        userId: user.id,
        taskId: secondTask.id,
        action: 'analogy',
        content: `**Mental Model / Analogy: The Signposted Highway**

Think of IELTS Speaking not as a test of speed, but as **driving a passenger down a scenic highway**.

* **Signposts (discourse markers)** tell the examiner where you are turning (*"On the flip side...", "Having said that..."*).
* If you drive erratically with sudden stops (long pauses searching for complex words), the examiner gets carsick.
* Maintain a smooth, steady cruising speed with clear navigational signposts.`,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  const token = isGuest ? `guest_token_${crypto.randomUUID()}` : DEMO_SESSION_TOKEN;
  await authSessions.createSession({
    token,
    userId: user.id,
    createdAt,
  });

  return {
    token,
    user,
  };
}
