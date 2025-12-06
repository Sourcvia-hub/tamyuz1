import axios from 'axios';
import { API_URL } from '@/config/api';

const PF_API_BASE = `${API_URL}/procureflix`;

export const pfApi = axios.create({
  baseURL: PF_API_BASE,
  withCredentials: true,
});

// VENDORS -----------------------------------------------------------------

export const fetchVendors = async () => {
  const res = await pfApi.get('/vendors');
  return res.data;
};

export const fetchVendorById = async (id) => {
  const res = await pfApi.get(`/vendors/${id}`);
  return res.data;
};

export const submitVendorDueDiligence = async (id, payload) => {
  const res = await pfApi.put(`/vendors/${id}/due-diligence`, payload);
  return res.data;
};

export const changeVendorStatus = async (id, status) => {
  const res = await pfApi.post(`/vendors/${id}/status/${status}`);
  return res.data;
};

export const fetchVendorRiskExplanation = async (id) => {
  const res = await pfApi.get(`/vendors/${id}/ai/risk-explanation`);
  return res.data;
};

// TENDERS -----------------------------------------------------------------

export const fetchTenders = async () => {
  const res = await pfApi.get('/tenders');
  return res.data;
};

export const fetchTenderById = async (id) => {
  const res = await pfApi.get(`/tenders/${id}`);
  return res.data;
};

export const fetchProposalsForTender = async (id) => {
  const res = await pfApi.get(`/tenders/${id}/proposals`);
  return res.data;
};

export const fetchTenderEvaluation = async (id) => {
  const res = await pfApi.get(`/tenders/${id}/evaluation`);
  return res.data;
};

export const evaluateTenderNow = async (id) => {
  const res = await pfApi.post(`/tenders/${id}/evaluate`);
  return res.data;
};

export const fetchTenderAISummary = async (id) => {
  const res = await pfApi.get(`/tenders/${id}/ai/summary`);
  return res.data;
};

export const fetchTenderAIEvaluationSuggestions = async (id) => {
  const res = await pfApi.post(`/tenders/${id}/ai/evaluation-suggestions`);
  return res.data;
};

// CONTRACTS ---------------------------------------------------------------

export const fetchContracts = async () => {
  const res = await pfApi.get('/contracts');
  return res.data;
};

export const fetchContractById = async (id) => {
  const res = await pfApi.get(`/contracts/${id}`);
  return res.data;
};

export const changeContractStatus = async (id, status) => {
  const res = await pfApi.post(`/contracts/${id}/status/${status}`);
  return res.data;
};

export const fetchContractAIAnalysis = async (id) => {
  const res = await pfApi.get(`/contracts/${id}/ai/analysis`);
  return res.data;
};
