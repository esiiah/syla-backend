// frontend/src/greetings.jsx

// Extract first name from full name
export const getFirstName = (fullName) => {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
};

// returns 'morning' | 'afternoon' | 'evening' | 'night'
export const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

export const getTimeGreeting = (period, firstName) => {
  if (period === "morning") return `Good morning, ${firstName}`;
  if (period === "afternoon") return `Good afternoon, ${firstName}`;
  if (period === "evening") return `Good evening, ${firstName}`;
  return `Hello, ${firstName}`;
};

export const getDayGreeting = (firstName) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `Happy ${days[new Date().getDay()]}, ${firstName}`;
};

// Casual greetings with proper punctuation based on context
export const getCasualGreeting = (firstName) => {
  const phrases = [
    `Welcome back, ${firstName}`,
    `Good to see you, ${firstName}`,
    `What's new? ${firstName}`,
    `Nice to have you, ${firstName}`,
    `How's it going? ${firstName}`,
    `Hope you're well, ${firstName}`,
    `Ready to get started? ${firstName}`,
    `Let's go again, ${firstName}`
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export const createHeroGreeting = (fullName) => {
  const firstName = getFirstName(fullName);
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const period = getTimePeriod();

  const lastGreetingDay = localStorage.getItem("lastGreetingDay");
  const lastGreetingPeriod = localStorage.getItem("lastGreetingPeriod");

  let greeting;

  // 1) Day greeting (once per calendar day)
  if (lastGreetingDay !== todayISO) {
    greeting = getDayGreeting(firstName);
    localStorage.setItem("lastGreetingDay", todayISO);
    localStorage.setItem("lastGreetingPeriod", period);
    return greeting;
  }

  // 2) Time-of-day greeting (once per period)
  if (lastGreetingPeriod !== period) {
    greeting = getTimeGreeting(period, firstName);
    localStorage.setItem("lastGreetingPeriod", period);
    return greeting;
  }

  // 3) Fallback: casual greeting
  greeting = getCasualGreeting(firstName);
  return greeting;
};