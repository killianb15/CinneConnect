/**
 * Service pour les reviews
 */

import api from './api';

export const createReview = async (filmId, reviewData) => {
  const response = await api.post(`/reviews/film/${filmId}`, reviewData);
  return response.data;
};

export const createOrUpdateReview = async (filmId, reviewData) => {
  const response = await api.post(`/reviews/film/${filmId}`, reviewData);
  return response.data;
};

export const getMyReviews = async () => {
  const response = await api.get('/reviews/my');
  return response.data;
};

export const getRecentReviews = async () => {
  const response = await api.get('/reviews/recent');
  return response.data;
};

