/**
 * Service pour les films
 */

import api from './api';

export const getLatestMovies = async () => {
  const response = await api.get('/movies/latest');
  return response.data;
};

export const getMovieDetails = async (id) => {
  const response = await api.get(`/movies/${id}`);
  return response.data;
};

export const searchMovies = async (query) => {
  const response = await api.get('/movies/search', {
    params: { q: query.trim() }
  });
  return response.data;
};

export const createMovie = async (movieData) => {
  const response = await api.post('/movies', movieData);
  return response.data;
};

