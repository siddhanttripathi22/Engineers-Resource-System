export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString();
};

export const isDateInPast = (date) => {
  return new Date(date) < new Date();
};

export const getDaysFromNow = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getProjectStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'in-progress';
};

// frontend/src/utils/validation.js
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

export const validateDate = (date) => {
  return !isNaN(new Date(date).getTime());
};

export const validateDateRange = (startDate, endDate) => {
  return new Date(startDate) <= new Date(endDate);
};


