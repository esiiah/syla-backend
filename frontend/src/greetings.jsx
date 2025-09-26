// frontend/src/greetings.jsx

// returns 'morning' | 'afternoon' | 'evening' | 'night'
export const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

export const getTimeGreeting = (period) => {
  if (period === "morning") return "Good morning";
  if (period === "afternoon") return "Good afternoon";
  if (period === "evening") return "Good evening";
  return "Hello";
};

export const getDayGreeting = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `Happy ${days[new Date().getDay()]}`; // e.g. "Happy Friday"
};

// Casual greetings should NOT include trailing punctuation or username
export const getCasualGreeting = () => {
  const phrases = [
    "Welcome back",
    "Good to see you",
    "What's new",
    "Nice to have you",
    "How's it going",
    "Hope you're well",
    "Ready to get started",
    "Let's make it a good one"
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

/**
 * createHeroGreeting()
 * - returns greeting text WITHOUT the username (App will append the username and style it)
 * - priority:
 *    1) If we haven't shown a day greeting today -> show day greeting (once per day)
 *    2) Else if we haven't shown the period greeting this period -> show time greeting (once per period)
 *    3) Else -> casual greeting
 */
export const createHeroGreeting = () => {
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const period = getTimePeriod();

  const lastGreetingDay = localStorage.getItem("lastGreetingDay"); // e.g. "2025-09-26"
  const lastGreetingPeriod = localStorage.getItem("lastGreetingPeriod"); // e.g. "morning"

  let greeting;

  // 1) Day greeting (once per calendar day)
  if (lastGreetingDay !== todayISO) {
    greeting = getDayGreeting(); // "Happy Friday"
    localStorage.setItem("lastGreetingDay", todayISO);
    // also mark that we've greeted for the current period, so afternoon/morning won't also fire immediately
    localStorage.setItem("lastGreetingPeriod", period);
    return greeting;
  }

  // 2) Time-of-day greeting (once per period)
  if (lastGreetingPeriod !== period) {
    greeting = getTimeGreeting(period); // "Good morning" / "Good afternoon" etc.
    localStorage.setItem("lastGreetingPeriod", period);
    return greeting;
  }

  // 3) Fallback: casual greeting
  greeting = getCasualGreeting(); // e.g. "Welcome back"
  return greeting;
};
