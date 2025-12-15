/**
 * Service pour les groupes
 */

import api from './api';

export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

export const getGroupDetails = async (groupId) => {
  const response = await api.get(`/groups/${groupId}`);
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/groups', groupData);
  return response.data;
};

export const updateGroup = async (groupId, groupData) => {
  const response = await api.put(`/groups/${groupId}`, groupData);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await api.delete(`/groups/${groupId}`);
  return response.data;
};

export const joinGroup = async (groupId) => {
  const response = await api.post(`/groups/${groupId}/join`);
  return response.data;
};

export const leaveGroup = async (groupId) => {
  const response = await api.post(`/groups/${groupId}/leave`);
  return response.data;
};

export const inviteToGroup = async (groupId, inviteEmail) => {
  const response = await api.post(`/groups/${groupId}/invite`, { inviteEmail });
  return response.data;
};

export const addFilmToGroup = async (groupId, filmId) => {
  const response = await api.post(`/groups/${groupId}/films`, { filmId });
  return response.data;
};


