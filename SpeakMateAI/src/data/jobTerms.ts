// Job-profile-specific vocabulary. Reviewing these terms BEFORE an interview
// substantially improves recall — real recruiters throw industry jargon at
// candidates and a shaky answer on "CAP theorem" or "repo rate" kills a round.
//
// Each entry stays tight (title + one-line definition + one interview example)
// so learners can flip through 15-20 cards in under 5 minutes. Terms curated
// from actual interview transcripts and role-specific hiring rubrics.

import type { InterviewTrack } from '@/types';

export interface JobTerm {
  term: string;
  definition: string;
  example: string;
}

export const JOB_TERMS: Record<InterviewTrack, JobTerm[]> = {
  hr: [
    { term: 'STAR framework', definition: 'Situation-Task-Action-Result — a structure for answering behavioural questions.', example: '"Tell me about a time you resolved a conflict" → describe Situation → your Task → the Action you took → the Result.' },
    { term: 'Notice period', definition: 'Time (typically 30/60/90 days) you must serve at your current job before joining a new one.', example: '"What is your notice period?" → "I\'m serving 60 days, negotiable to 30 with buyout."' },
    { term: 'CTC vs In-hand', definition: 'CTC = total cost to company (annual, includes benefits). In-hand = actual monthly take-home.', example: '"₹12 LPA CTC → about ₹80,000 in-hand per month after tax and PF."' },
    { term: 'Behavioural question', definition: 'A question asking about past experience to predict future behaviour.', example: '"Tell me about a time you failed" — always use STAR.' },
    { term: 'Situational question', definition: 'Hypothetical scenario to test problem-solving.', example: '"What would you do if a teammate missed a deadline?"' },
    { term: 'Culture fit', definition: 'Alignment between your working style and company values.', example: 'Research the company\'s values page before answering "Why our company?"' },
    { term: 'Referral', definition: 'When a current employee recommends you internally — often bypasses initial screening.', example: 'Ask for referrals on LinkedIn rather than cold-applying.' },
    { term: 'Reference check', definition: 'Recruiter calls previous manager/colleague to verify claims.', example: 'Always ask a former manager for permission before listing them.' },
  ],
  fresher: [
    { term: 'Final year project', definition: 'The capstone project of your degree — recruiters love this question.', example: '"Walk me through your FYP" → problem → tech stack → your role → outcome.' },
    { term: 'CGPA vs percentage', definition: 'CGPA is out of 10; percentage is /100. Some companies still ask for percentage.', example: '"CGPA 8.2 = roughly 78%" (varies by university).' },
    { term: 'Internship vs Live project', definition: 'Internship = official paid/unpaid company stint; Live project = freelance/personal work.', example: 'On resume, differentiate clearly — don\'t inflate a college project as internship.' },
    { term: 'Aptitude test', definition: 'First screening round — quant, logical, verbal reasoning under time pressure.', example: 'Practice on IndiaBix / Careers360 for 2 weeks before campus season.' },
    { term: 'Group Discussion (GD)', definition: 'Round where 6-10 candidates debate a topic — tests communication + leadership.', example: 'Listen before you speak. Never interrupt. Summarise at the end for bonus.' },
    { term: 'Bond', definition: 'Contractual obligation to stay at the company for X months/years (₹ penalty if you leave).', example: 'TCS ilp — 1 year bond, ₹50k penalty. Read carefully before signing.' },
    { term: 'On-campus vs Off-campus', definition: 'On = through college placement; Off = you apply directly.', example: 'On-campus = higher offer volume, lower salary. Off-campus = harder, better packages.' },
  ],
  technical: [
    { term: 'Time complexity', definition: 'How runtime scales with input size — expressed as O(n), O(log n), etc.', example: 'Binary search = O(log n). Linear search = O(n). Nested loop = O(n²).' },
    { term: 'Space complexity', definition: 'How memory usage scales with input.', example: 'Recursion uses stack space — factorial recursive = O(n) space.' },
    { term: 'OOP pillars', definition: 'Encapsulation, Inheritance, Polymorphism, Abstraction.', example: 'Encapsulation = private fields + public methods. Inheritance = extends keyword.' },
    { term: 'REST', definition: 'REpresentational State Transfer — HTTP-based API paradigm using GET/POST/PUT/DELETE.', example: 'GET /users/1 fetches user 1. POST /users creates a new user.' },
    { term: 'Idempotent', definition: 'Same request produces the same result no matter how many times you send it.', example: 'GET and PUT are idempotent. POST is NOT.' },
    { term: 'Database index', definition: 'A sorted data structure that speeds up SELECT queries but slows down INSERT/UPDATE.', example: 'Add index on `email` if you query `WHERE email = ?` frequently.' },
    { term: 'ACID', definition: 'Atomicity, Consistency, Isolation, Durability — properties of reliable DB transactions.', example: 'Bank transfer needs ACID: either both accounts update, or neither.' },
    { term: 'CAP theorem', definition: 'In a distributed system, you can pick only 2 of: Consistency, Availability, Partition-tolerance.', example: 'MongoDB = CP by default. Cassandra = AP. Traditional SQL = CA (single-node).' },
  ],
  experienced: [
    { term: 'IC vs Manager track', definition: 'Individual Contributor = deep expert. Manager = people leader. Companies now have parallel ladders.', example: '"Do you want to stay IC or move to management?" — pick one, back it up.' },
    { term: 'Ownership', definition: 'Taking end-to-end responsibility for outcomes, not just tasks.', example: '"I owned the checkout redesign from PRD through launch, +12% conversion."' },
    { term: 'RACI matrix', definition: 'Responsible / Accountable / Consulted / Informed — clarifies roles on cross-team projects.', example: 'Use RACI when a project stalls due to unclear decision-makers.' },
    { term: 'Postmortem', definition: 'Blameless review of an outage or major bug — focuses on systems, not individuals.', example: '"We had a P1 last quarter — root cause was a missing null check + no test coverage."' },
    { term: '1:1 with skip-level', definition: 'A meeting with your manager\'s manager, usually quarterly.', example: 'Use it to raise concerns you can\'t take to your direct manager.' },
    { term: 'OKRs', definition: 'Objectives + Key Results — quarterly goal-setting framework popularised by Google.', example: 'Objective: "Improve app performance". KR1: "Reduce p95 latency from 2s to 800ms".' },
    { term: 'Impact vs effort', definition: 'How to prioritise: pick tasks with high impact / low effort first.', example: 'Kill projects that are high effort / low impact even if you\'re halfway done.' },
  ],
  business_analyst: [
    { term: 'BRD', definition: 'Business Requirements Document — what the business wants (non-technical).', example: 'BRD says "reduce checkout drop-off". Doesn\'t say how.' },
    { term: 'FRD', definition: 'Functional Requirements Document — how the system will meet the BRD (technical).', example: 'FRD specifies API contracts, DB schema, UI states.' },
    { term: 'User story', definition: '"As a [role], I want [feature], so that [benefit]." — Agile format.', example: '"As a shopper, I want saved addresses so I can check out faster."' },
    { term: 'Acceptance criteria', definition: 'Bullet-point conditions that must be true for a user story to be Done.', example: 'Given I\'m logged in, when I click "Save address", then it appears in my profile within 2s.' },
    { term: 'MoSCoW prioritisation', definition: 'Must / Should / Could / Won\'t — a framework for scope decisions.', example: 'MVP has only Musts. V2 adds Shoulds.' },
    { term: 'Scope creep', definition: 'When new requirements sneak in mid-sprint without stakeholder sign-off.', example: 'Handle by adding to backlog + explaining trade-off vs current deliverables.' },
    { term: 'Sprint retro', definition: 'End-of-sprint meeting: what went well / what didn\'t / action items.', example: 'BAs often facilitate the retro alongside the Scrum Master.' },
  ],
  sales: [
    { term: 'SPIN selling', definition: 'Situation / Problem / Implication / Need-payoff — question-based sales method.', example: 'Ask about current setup (S) → what breaks (P) → cost of that pain (I) → benefit of fix (N).' },
    { term: 'BANT', definition: 'Budget / Authority / Need / Timeline — qualifying a lead.', example: '"Do you have budget approved this quarter?" (B) "Who else needs to sign off?" (A)' },
    { term: 'Cold call vs Warm lead', definition: 'Cold = no prior interaction. Warm = they\'ve engaged (opened email, downloaded whitepaper).', example: 'Cold calling conversion ~2%. Warm lead conversion 20%+.' },
    { term: 'Objection handling', definition: 'The framework for responding to "I need to think", "Too expensive", etc.', example: 'Acknowledge → Isolate → Overcome → Confirm.' },
    { term: 'Closing techniques', definition: 'Trial close, assumptive close, urgency close.', example: 'Assumptive: "Should I send the contract by Monday?" (assumes yes).' },
    { term: 'CAC vs LTV', definition: 'Customer Acquisition Cost vs Lifetime Value — ideal ratio is 1:3+.', example: 'Spending ₹5000 to acquire a user who spends ₹15,000 lifetime = 1:3, healthy.' },
    { term: 'MRR / ARR', definition: 'Monthly / Annual Recurring Revenue — SaaS metrics.', example: 'ARR = MRR × 12. Investors care about ARR growth rate.' },
  ],
  customer_support: [
    { term: 'SLA', definition: 'Service Level Agreement — promised response/resolution time.', example: 'Tier-1 tickets: SLA = 4 hour first response, 24 hour resolution.' },
    { term: 'First Response Time (FRT)', definition: 'How long between customer reaching out and first agent reply.', example: 'Industry benchmark: <10 min for live chat, <2 hour for email.' },
    { term: 'CSAT', definition: 'Customer Satisfaction Score — the "how would you rate this interaction?" survey.', example: 'Great support teams hit 90%+ CSAT.' },
    { term: 'De-escalation', definition: 'Calming down an upset customer through empathy and control of tone.', example: 'Never say "calm down". Instead: "I completely understand the frustration."' },
    { term: 'Ticket triage', definition: 'Prioritising incoming tickets by severity and business impact.', example: 'P1 = revenue-blocking outage. P4 = cosmetic bug. Handle P1 in <15 min.' },
    { term: 'Escalation matrix', definition: 'Predefined path for who to loop in when a ticket needs a manager/engineer.', example: 'Refund > ₹5000 → escalate to team lead. Downtime → engineering.' },
    { term: 'NPS', definition: 'Net Promoter Score — "how likely are you to recommend us?" (0-10).', example: 'Above 50 = excellent. Below 0 = alarming.' },
  ],
  software_engineer: [
    { term: 'System design', definition: 'Interview round where you sketch scalable architectures on a whiteboard.', example: '"Design Twitter feed" → discuss timeline generation, caching, sharding, pull vs push.' },
    { term: 'Sharding', definition: 'Horizontally splitting a database across multiple servers by a key.', example: 'Shard users by `user_id % 10` across 10 DB servers.' },
    { term: 'Load balancer', definition: 'Distributes incoming traffic across multiple servers.', example: 'Round-robin, least-connections, IP-hash are common algorithms.' },
    { term: 'Cache invalidation', definition: 'Deciding when to remove stale entries from a cache — famously hard.', example: 'TTL-based, write-through, cache-aside are strategies.' },
    { term: 'Concurrency vs Parallelism', definition: 'Concurrency = juggling tasks (may take turns). Parallelism = actually running simultaneously.', example: 'Node.js single-threaded event loop = concurrency. Go with goroutines = parallelism.' },
    { term: 'Microservices', definition: 'Architecture where each business capability is a separate deployable service.', example: 'Trade-off: independent scaling BUT harder debugging + network overhead.' },
    { term: 'CI/CD', definition: 'Continuous Integration / Continuous Deployment — auto-test + auto-deploy pipelines.', example: 'Push to main → GitHub Actions runs tests → deploys to prod on green.' },
  ],
  data_analyst: [
    { term: 'Window functions', definition: 'SQL functions that operate over a set of rows (ROW_NUMBER, LAG, LEAD, RANK).', example: 'Get each user\'s last order: SELECT ... ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY date DESC).' },
    { term: 'Join types', definition: 'INNER (only matches), LEFT (all left + matches), RIGHT, FULL OUTER.', example: 'LEFT JOIN when you want all users even those without orders.' },
    { term: 'CTE', definition: 'Common Table Expression — a temp result set using WITH clause.', example: 'WITH monthly AS (SELECT ... GROUP BY month) SELECT * FROM monthly WHERE ...' },
    { term: 'Correlation vs Causation', definition: 'Two variables moving together does NOT mean one causes the other.', example: 'Ice cream sales & drowning both peak in summer — heat causes both.' },
    { term: 'A/B test', definition: 'Random controlled experiment: split users into control + variant, measure lift.', example: 'Need sample size + duration + primary metric decided BEFORE the test.' },
    { term: 'Cohort analysis', definition: 'Group users by shared characteristic (signup month) and track them over time.', example: 'Jan cohort retention day 30 = 40%; Feb cohort = 45% → good signal.' },
    { term: 'ETL / ELT', definition: 'Extract-Transform-Load (old) vs Extract-Load-Transform (modern data warehouses).', example: 'Modern stack: raw data → BigQuery → dbt models → dashboards.' },
  ],
  marketing: [
    { term: 'CAC', definition: 'Customer Acquisition Cost — money spent to acquire one paying customer.', example: '₹1L spent on ads → 20 paying users → CAC = ₹5000.' },
    { term: 'LTV', definition: 'Lifetime Value — total revenue a customer generates over their entire relationship.', example: 'Subscription ₹500/mo × avg retention 24 months = ₹12,000 LTV.' },
    { term: 'ROAS', definition: 'Return on Ad Spend = revenue / ad-spend.', example: '₹10L revenue from ₹2L ad spend = 5x ROAS.' },
    { term: 'CTR vs CVR', definition: 'Click-Through Rate = clicks/impressions. Conversion Rate = conversions/clicks.', example: 'High CTR + low CVR = catchy ad but landing page fails.' },
    { term: 'Funnel', definition: 'The user journey stages from awareness → interest → decision → action.', example: 'Track drop-off at each step — biggest gap = highest-leverage fix.' },
    { term: 'Brand vs Performance', definition: 'Brand = long-term recall building. Performance = attributable ROI.', example: 'Rule of thumb: 60% performance / 40% brand for growth-stage companies.' },
    { term: 'MQL vs SQL', definition: 'Marketing Qualified Lead vs Sales Qualified Lead — handoff criteria differ.', example: 'MQL = downloaded ebook. SQL = requested demo. Marketing hands off SQLs to sales.' },
  ],
  banking: [
    { term: 'Repo rate', definition: 'Rate at which RBI lends to commercial banks. Affects your loan EMI.', example: 'RBI cuts repo → banks lower loan rates → borrowing gets cheaper.' },
    { term: 'CASA ratio', definition: 'Current Account + Savings Account / Total Deposits. Higher = cheaper funds for bank.', example: 'HDFC CASA ~40-45%. Higher CASA banks have higher NIM.' },
    { term: 'NIM', definition: 'Net Interest Margin — spread between interest earned on loans vs paid on deposits.', example: 'NIM 4% = for every ₹100 deposit-loan cycle, bank makes ₹4 gross.' },
    { term: 'KYC / AML', definition: 'Know Your Customer / Anti-Money Laundering — mandatory identity verification.', example: 'PAN + Aadhaar + address proof + selfie for full KYC.' },
    { term: 'CIBIL score', definition: 'Credit score (300-900). Determines loan eligibility and interest rate.', example: '750+ = excellent. Below 650 = home loan will be tough.' },
    { term: 'NPA', definition: 'Non-Performing Asset — a loan where interest hasn\'t been paid for 90+ days.', example: 'Higher NPAs = weaker bank balance sheet. Watch this in bank interviews.' },
    { term: 'CASA vs Term deposit', definition: 'CASA = liquid, low interest. Term (FD/RD) = locked-in, higher interest.', example: 'Savings 3% p.a. vs 1-year FD 7% p.a.' },
  ],
};

export function getJobTerms(track: InterviewTrack): JobTerm[] {
  return JOB_TERMS[track] || [];
}
