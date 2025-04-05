// app.js
// This will be placed in the public directory

// Constants
const API_BASE_URL = '/api';
const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/analyze`,
  history: `${API_BASE_URL}/history`,
  analysis: `${API_BASE_URL}/analysis`
};

// DOM Elements
const elements = {
  // Navigation
  menuToggle: document.getElementById('menuToggle'),
  navMenu: document.getElementById('navMenu'),
  navLinks: document.querySelectorAll('.nav-menu a'),
  views: document.querySelectorAll('.view'),
  
  // Analyze Form
  analyzeForm: document.getElementById('analyzeForm'),
  urlInput: document.getElementById('urlInput'),
  analyzeButton: document.getElementById('analyzeButton'),
  saveResults: document.getElementById('saveResults'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  resultsContainer: document.getElementById('resultsContainer'),
  
  // History
  historySearch: document.getElementById('historySearch'),
  historySort: document.getElementById('historySort'),
  historyList: document.getElementById('historyList'),
  
  // Settings
  darkMode: document.getElementById('darkMode'),
  compactView: document.getElementById('compactView'),
  autoSave: document.getElementById('autoSave'),
  competitorAnalysis: document.getElementById('competitorAnalysis'),
  reportDetail: document.getElementById('reportDetail'),
  clearHistory: document.getElementById('clearHistory'),
  exportData: document.getElementById('exportData'),
  
  // Templates
  resultTemplate: document.getElementById('resultTemplate'),
  recommendationTemplate: document.getElementById('recommendationTemplate'),
  historyItemTemplate: document.getElementById('historyItemTemplate')
};

// State
const state = {
  currentView: 'analyze',
  currentAnalysis: null,
  history: [],
  settings: {
    darkMode: false,
    compactView: false,
    autoSave: true,
    competitorAnalysis: true,
    reportDetail: 'standard'
  }
};

// Initialize App
function initApp() {
  // Load settings from localStorage
  loadSettings();
  
  // Apply settings
  applySettings();
  
  // Load history
  loadHistory();
  
  // Add event listeners
  addEventListeners();
}

// Event Listeners
function addEventListeners() {
  // Mobile menu toggle
  elements.menuToggle.addEventListener('click', toggleMenu);
  
  // Navigation
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = e.target.getAttribute('data-view');
      switchView(viewName);
    });
  });
  
  // Analyze form
  elements.analyzeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    analyzeWebsite();
  });
  
  // History search and sort
  elements.historySearch.addEventListener('input', filterHistory);
  elements.historySort.addEventListener('change', sortHistory);
  
  // Settings
  elements.darkMode.addEventListener('change', () => {
    state.settings.darkMode = elements.darkMode.checked;
    applySettings();
    saveSettings();
  });
  
  elements.compactView.addEventListener('change', () => {
    state.settings.compactView = elements.compactView.checked;
    applySettings();
    saveSettings();
  });
  
  elements.autoSave.addEventListener('change', () => {
    state.settings.autoSave = elements.autoSave.checked;
    saveSettings();
  });
  
  elements.competitorAnalysis.addEventListener('change', () => {
    state.settings.competitorAnalysis = elements.competitorAnalysis.checked;
    saveSettings();
  });
  
  elements.reportDetail.addEventListener('change', () => {
    state.settings.reportDetail = elements.reportDetail.value;
    saveSettings();
  });
  
  elements.clearHistory.addEventListener('click', clearHistory);
  elements.exportData.addEventListener('click', exportData);
  
  // Tab buttons (delegated event)
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
      const tabId = e.target.getAttribute('data-tab');
      const tabsContainer = e.target.closest('.tabs-container');
      
      // Remove active class from all tabs
      tabsContainer.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Add active class to clicked tab
      e.target.classList.add('active');
      
      // Hide all tab panes
      tabsContainer.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      
      // Show selected tab pane
      tabsContainer.querySelector(`#${tabId}`).classList.add('active');
    }
  });
}

// Navigation Functions
function toggleMenu() {
  elements.navMenu.classList.toggle('show');
}

function switchView(viewName) {
  // Update state
  state.currentView = viewName;
  
  // Update navigation
  elements.navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    }
  });
  
  // Update view
  elements.views.forEach(view => {
    view.classList.remove('active');
    if (view.id === `${viewName}View`) {
      view.classList.add('active');
    }
  });
  
  // Hide mobile menu
  elements.navMenu.classList.remove('show');
  
  // Additional actions for specific views
  if (viewName === 'history') {
    renderHistory();
  }
}

// Analysis Functions
async function analyzeWebsite() {
  const url = elements.urlInput.value.trim();
  if (!url) return;
  
  try {
    // Show loading indicator
    elements.loadingIndicator.classList.remove('hidden');
    elements.resultsContainer.classList.add('hidden');
    
    // Disable form
    elements.analyzeButton.disabled = true;
    elements.urlInput.disabled = true;
    
    // Make API request
    const response = await fetch(API_ENDPOINTS.analyze, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        includeCompetitors: state.settings.competitorAnalysis
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze website');
    }
    
    // Get analysis data
    const analysisData = await response.json();
    
    // Update state
    state.currentAnalysis = analysisData;
    
    // Save to history if enabled
    if (elements.saveResults.checked || state.settings.autoSave) {
      saveAnalysisToHistory(analysisData);
    }
    
    // Render results
    renderAnalysisResults(analysisData);
  } catch (error) {
    showError(error.message);
  } finally {
    // Hide loading indicator
    elements.loadingIndicator.classList.add('hidden');
    
    // Enable form
    elements.analyzeButton.disabled = false;
    elements.urlInput.disabled = false;
  }
}

function renderAnalysisResults(data) {
  // Clone template
  const template = elements.resultTemplate.content.cloneNode(true);
  
  // Populate basic info
  template.querySelector('.website-url').textContent = data.url;
  template.querySelector('.analyzed-date').textContent = `Analyzed on ${formatDate(new Date(data.timestamp || Date.now()))}`;
  
  // Populate overall score
  const overallScore = data.overallScore.overall;
  const scoreElement = template.querySelector('.overall-score .score-value');
  scoreElement.textContent = overallScore;
  
  // Add score class
  const scoreCircle = template.querySelector('.score-circle');
  scoreCircle.classList.add(getScoreClass(overallScore));
  
  // Populate score breakdown
  const breakdown = data.overallScore.breakdown;
  
  // Performance
  populateScoreCategory(template, 'performance', breakdown.performance.score);
  
  // SEO
  populateScoreCategory(template, 'seo', breakdown.seo.score);
  
  // Content
  populateScoreCategory(template, 'content', breakdown.content.score);
  
  // Freshness
  populateScoreCategory(template, 'freshness', breakdown.freshness.score);
  
  // Mobile
  populateScoreCategory(template, 'mobile', breakdown.mobileFriendly.score);
  
  // Populate recommendations
  const recommendationsContainer = template.querySelector('#recommendations .recommendations-list');
  data.recommendations.forEach(recommendation => {
    const recTemplate = elements.recommendationTemplate.content.cloneNode(true);
    
    // Add priority class
    recTemplate.querySelector('.recommendation-item').classList.add(recommendation.priority);
    
    // Populate recommendation priority
    const priorityElement = recTemplate.querySelector('.recommendation-priority');
    priorityElement.textContent = recommendation.priority;
    priorityElement.classList.add(recommendation.priority);
    
    // Populate recommendation title and description
    recTemplate.querySelector('.recommendation-title').textContent = recommendation.title;
    recTemplate.querySelector('.recommendation-description').textContent = recommendation.description;
    
    // Populate recommendation details
    const detailsList = recTemplate.querySelector('.recommendation-details');
    recommendation.details.forEach(detail => {
      const li = document.createElement('li');
      li.textContent = detail;
      detailsList.appendChild(li);
    });
    
    recommendationsContainer.appendChild(recTemplate);
  });
  
  // Populate metrics
  const metricsContainer = template.querySelector('#metrics .metrics-grid');
  
  // Performance metrics
  if (data.lighthouseResults && data.lighthouseResults.metrics) {
    const metrics = data.lighthouseResults.metrics;
    
    Object.entries(metrics).forEach(([key, value]) => {
      const metricCard = document.createElement('div');
      metricCard.className = 'metric-card';
      
      const metricName = document.createElement('div');
      metricName.className = 'metric-name';
      metricName.textContent = formatMetricName(key);
      
      const metricValue = document.createElement('div');
      metricValue.className = 'metric-value';
      metricValue.textContent = value;
      
      metricCard.appendChild(metricName);
      metricCard.appendChild(metricValue);
      
      metricsContainer.appendChild(metricCard);
    });
  }
  
  // Site info metrics
  if (data.siteInfo) {
    const siteInfo = data.siteInfo;
    
    // Add word count
    addMetricCard(metricsContainer, 'Total Word Count', siteInfo.wordCount || 'N/A');
    
    // Add image metrics
    addMetricCard(metricsContainer, 'Images', `${siteInfo.imagesWithAlt || 0}/${siteInfo.images || 0} with alt text`);
    
    // Add link metrics
    addMetricCard(metricsContainer, 'Internal Links', siteInfo.internalLinks || 0);
    addMetricCard(metricsContainer, 'External Links', siteInfo.externalLinks || 0);
  }
  
  // Last updated
  if (data.lastUpdated && data.lastUpdated.found) {
    addMetricCard(metricsContainer, 'Last Updated', formatDate(new Date(data.lastUpdated.lastUpdated)));
    addMetricCard(metricsContainer, 'Content Age', `${data.lastUpdated.ageInDays} days`);
  }
  
  // Populate competitors
  const competitorsContainer = template.querySelector('#competitors .competitors-list');
  
  if (data.competitorInfo && data.competitorInfo.competitors) {
    data.competitorInfo.competitors.forEach(competitor => {
      const competitorCard = document.createElement('div');
      competitorCard.className = 'competitor-card';
      
      const competitorDomain = document.createElement('div');
      competitorDomain.className = 'competitor-domain';
      competitorDomain.textContent = competitor.domain;
      
      const competitorMetrics = document.createElement('ul');
      competitorMetrics.className = 'competitor-metrics';
      
      // Common keywords
      const keywordsLi = document.createElement('li');
      const keywordsLabel = document.createElement('span');
      keywordsLabel.className = 'metric-label';
      keywordsLabel.textContent = 'Common Keywords';
      
      const keywordsValue = document.createElement('span');
      keywordsValue.className = 'metric-value';
      keywordsValue.textContent = competitor.commonKeywords;
      
      keywordsLi.appendChild(keywordsLabel);
      keywordsLi.appendChild(keywordsValue);
      competitorMetrics.appendChild(keywordsLi);
      
      // Similarity score
      const scoreLi = document.createElement('li');
      const scoreLabel = document.createElement('span');
      scoreLabel.className = 'metric-label';
      scoreLabel.textContent = 'Similarity Score';
      
      const scoreValue = document.createElement('span');
      scoreValue.className = 'metric-value';
      scoreValue.textContent = `${competitor.score}/100`;
      
      scoreLi.appendChild(scoreLabel);
      scoreLi.appendChild(scoreValue);
      competitorMetrics.appendChild(scoreLi);
      
      competitorCard.appendChild(competitorDomain);
      competitorCard.appendChild(competitorMetrics);
      
      competitorsContainer.appendChild(competitorCard);
    });
  } else {
    const noCompetitors = document.createElement('p');
    noCompetitors.textContent = 'No competitor data available.';
    competitorsContainer.appendChild(noCompetitors);
  }
  
  // Add download report button functionality
  const downloadButton = template.querySelector('.download-report');
  downloadButton.addEventListener('click', () => {
    downloadReport(data);
  });
  
  // Add share button functionality
  const shareButton = template.querySelector('.share-report');
  shareButton.addEventListener('click', () => {
    shareReport(data);
  });
  
  // Clear previous results
  elements.resultsContainer.innerHTML = '';
  
  // Add new results
  elements.resultsContainer.appendChild(template);
  
  // Show results container
  elements.resultsContainer.classList.remove('hidden');
  elements.resultsContainer.classList.add('fade-in');
  
  // Scroll to results
  elements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Helper Functions
function populateScoreCategory(template, category, score) {
  const categoryElement = template.querySelector(`.score-category.${category}`);
  const barFill = categoryElement.querySelector('.bar-fill');
  const categoryScore = categoryElement.querySelector('.category-score');
  
  // Set score
  categoryScore.textContent = `${Math.round(score)}/100`;
  
  // Set bar fill width
  barFill.style.width = `${score}%`;
  
  // Add score class
  barFill.classList.add(getScoreClass(score));
}

function getScoreClass(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'poor';
  return 'bad';
}

function formatMetricName(key) {
  // Convert camelCase to Title Case with spaces
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function addMetricCard(container, name, value) {
  const metricCard = document.createElement('div');
  metricCard.className = 'metric-card';
  
  const metricName = document.createElement('div');
  metricName.className = 'metric-name';
  metricName.textContent = name;
  
  const metricValue = document.createElement('div');
  metricValue.className = 'metric-value';
  metricValue.textContent = value;
  
  metricCard.appendChild(metricName);
  metricCard.appendChild(metricValue);
  
  container.appendChild(metricCard);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// History Functions
function saveAnalysisToHistory(analysisData) {
  // Create a simplified history item
  const historyItem = {
    id: generateId(),
    url: analysisData.url,
    timestamp: analysisData.timestamp || Date.now(),
    score: analysisData.overallScore.overall,
    analysis: analysisData
  };
  
  // Add to state
  state.history.unshift(historyItem);
  
  // Save to localStorage
  saveHistory();
}

function loadHistory() {
  try {
    const historyData = localStorage.getItem('prospectProHistory');
    if (historyData) {
      state.history = JSON.parse(historyData);
    }
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function saveHistory() {
  try {
    localStorage.setItem('prospectProHistory', JSON.stringify(state.history));
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

function renderHistory() {
  // Clear history list
  elements.historyList.innerHTML = '';
  
  // Apply filters
  const filteredHistory = filterAndSortHistory();
  
  // Create and append history items
  filteredHistory.forEach(item => {
    const historyItem = createHistoryItem(item);
    elements.historyList.appendChild(historyItem);
  });
  
  // Show empty state if no history
  if (filteredHistory.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No analysis history found.';
    elements.historyList.appendChild(emptyState);
  }
}

function createHistoryItem(item) {
  // Clone template
  const template = elements.historyItemTemplate.content.cloneNode(true);
  
  // Set URL
  template.querySelector('.history-url').textContent = item.url;
  
  // Set date
  template.querySelector('.history-date').textContent = formatDate(new Date(item.timestamp));
  
  // Set score
  const scoreElement = template.querySelector('.history-score');
  scoreElement.textContent = item.score;
  scoreElement.classList.add(getScoreClass(item.score));
  
  // Add view button functionality
  template.querySelector('.btn-view').addEventListener('click', () => {
    viewHistoryItem(item);
  });
  
  // Add delete button functionality
  template.querySelector('.btn-delete').addEventListener('click', () => {
    deleteHistoryItem(item.id);
  });
  
  return template;
}

function viewHistoryItem(item) {
  // Set current analysis
  state.currentAnalysis = item.analysis;
  
  // Switch to analyze view
  switchView('analyze');
  
  // Render analysis results
  renderAnalysisResults(item.analysis);
}

function deleteHistoryItem(id) {
  // Filter out the deleted item
  state.history = state.history.filter(item => item.id !== id);
  
  // Save updated history
  saveHistory();
  
  // Re-render history
  renderHistory();
}

function filterAndSortHistory() {
  // Get search term and sort option
  const searchTerm = elements.historySearch.value.trim().toLowerCase();
  const sortOption = elements.historySort.value;
  
  // Filter history
  let filteredHistory = state.history;
  
  if (searchTerm) {
    filteredHistory = filteredHistory.filter(item => 
      item.url.toLowerCase().includes(searchTerm)
    );
  }
  
  // Sort history
  filteredHistory.sort((a, b) => {
    switch (sortOption) {
      case 'date-desc':
        return b.timestamp - a.timestamp;
      case 'date-asc':
        return a.timestamp - b.timestamp;
      case 'score-desc':
        return b.score - a.score;
      case 'score-asc':
        return a.score - b.score;
      default:
        return 0;
    }
  });
  
  return filteredHistory;
}

function filterHistory() {
  renderHistory();
}

function sortHistory() {
  renderHistory();
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
    // Clear history state
    state.history = [];
    
    // Clear localStorage
    localStorage.removeItem('prospectProHistory');
    
    // Re-render history
    renderHistory();
  }
}

function exportData() {
  try {
    // Create data object
    const exportData = {
      history: state.history,
      settings: state.settings,
      exportDate: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create blob
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospectpro-export-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
    alert('Failed to export data. Please try again.');
  }
}

// Settings Functions
function loadSettings() {
  try {
    const settingsData = localStorage.getItem('prospectProSettings');
    if (settingsData) {
      state.settings = { ...state.settings, ...JSON.parse(settingsData) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('prospectProSettings', JSON.stringify(state.settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function applySettings() {
  // Apply dark mode
  if (state.settings.darkMode) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  
  // Apply compact view
  if (state.settings.compactView) {
    document.body.classList.add('compact-view');
  } else {
    document.body.classList.remove('compact-view');
  }
  
  // Update settings form to match state
  elements.darkMode.checked = state.settings.darkMode;
  elements.compactView.checked = state.settings.compactView;
  elements.autoSave.checked = state.settings.autoSave;
  elements.competitorAnalysis.checked = state.settings.competitorAnalysis;
  elements.reportDetail.value = state.settings.reportDetail;
}

// Report Functions
function downloadReport(data) {
  try {
    // Create report HTML
    const reportHtml = generateReportHtml(data);
    
    // Convert to PDF using HTML2PDF (mock implementation)
    // In a real implementation, you'd use a library like html2pdf.js
    // For this example, we'll just create an HTML file
    
    // Create blob
    const blob = new Blob([reportHtml], { type: 'text/html' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospectpro-report-${data.url.replace(/[^a-z0-9]/gi, '-')}.html`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download report:', error);
    alert('Failed to download report. Please try again.');
  }
}

function generateReportHtml(data) {
  // Create basic report template
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ProspectPro Report: ${data.url}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .score-summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }
        
        .score-card {
          text-align: center;
          margin: 10px;
          padding: 15px;
          border-radius: 8px;
          background-color: #f5f5f5;
          min-width: 150px;
        }
        
        .score-value {
          font-size: 2rem;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .recommendations {
          margin-bottom: 30px;
        }
        
        .recommendation {
          margin-bottom: 20px;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        
        .recommendation-title {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .recommendation-priority {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          color: white;
          margin-right: 10px;
        }
        
        .priority-high {
          background-color: #f44336;
        }
        
        .priority-medium {
          background-color: #ff9800;
        }
        
        .priority-low {
          background-color: #2196f3;
        }
        
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          grid-gap: 15px;
          margin-bottom: 30px;
        }
        
        .metric {
          padding: 15px;
          border-radius: 8px;
          background-color: #f5f5f5;
        }
        
        .metric-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 0.9rem;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ProspectPro Analysis Report</h1>
        <p>URL: ${data.url}</p>
        <p>Generated on: ${formatDate(new Date(data.timestamp || Date.now()))}</p>
      </div>
      
      <div class="score-summary">
        <div class="score-card">
          <h3>Overall Score</h3>
          <div class="score-value">${data.overallScore.overall}</div>
        </div>
        
        <div class="score-card">
          <h3>Performance</h3>
          <div class="score-value">${Math.round(data.overallScore.breakdown.performance.score)}</div>
        </div>
        
        <div class="score-card">
          <h3>SEO</h3>
          <div class="score-value">${Math.round(data.overallScore.breakdown.seo.score)}</div>
        </div>
        
        <div class="score-card">
          <h3>Content</h3>
          <div class="score-value">${Math.round(data.overallScore.breakdown.content.score)}</div>
        </div>
        
        <div class="score-card">
          <h3>Freshness</h3>
          <div class="score-value">${Math.round(data.overallScore.breakdown.freshness.score)}</div>
        </div>
      </div>
      
      <h2>Recommendations</h2>
      <div class="recommendations">
        ${data.recommendations.map(rec => `
          <div class="recommendation">
            <div class="recommendation-title">
              <span class="recommendation-priority priority-${rec.priority}">${rec.priority}</span>
              ${rec.title}
            </div>
            <p>${rec.description}</p>
            <ul>
              ${rec.details.map(detail => `<li>${detail}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      
      <h2>Detailed Metrics</h2>
      <div class="metrics">
        ${data.lighthouseResults && data.lighthouseResults.metrics ? 
          Object.entries(data.lighthouseResults.metrics).map(([key, value]) => `
            <div class="metric">
              <div class="metric-name">${formatMetricName(key)}</div>
              <div class="metric-value">${value}</div>
            </div>
          `).join('') : ''}
        
        ${data.siteInfo ? `
          <div class="metric">
            <div class="metric-name">Total Word Count</div>
            <div class="metric-value">${data.siteInfo.wordCount || 'N/A'}</div>
          </div>
          
          <div class="metric">
            <div class="metric-name">Images</div>
            <div class="metric-value">${data.siteInfo.imagesWithAlt || 0}/${data.siteInfo.images || 0} with alt text</div>
          </div>
          
          <div class="metric">
            <div class="metric-name">Internal Links</div>
            <div class="
<div class="metric-name">Internal Links</div>
<div class="metric-value">${data.siteInfo.internalLinks || 0}</div>
</div>

<div class="metric">
<div class="metric-name">External Links</div>
<div class="metric-value">${data.siteInfo.externalLinks || 0}</div>
</div>
` : ''}

${data.lastUpdated && data.lastUpdated.found ? `
<div class="metric">
<div class="metric-name">Last Updated</div>
<div class="metric-value">${formatDate(new Date(data.lastUpdated.lastUpdated))}</div>
</div>

<div class="metric">
<div class="metric-name">Content Age</div>
<div class="metric-value">${data.lastUpdated.ageInDays} days</div>
</div>
` : ''}
</div>

<div class="footer">
<p>Report generated by ProspectPro - Website Analysis Tool</p>
<p>© ${new Date().getFullYear()} ProspectPro</p>
</div>
</body>
</html>
`;
}

function shareReport(data) {
  // Check if Web Share API is available
  if (navigator.share) {
    // Create share data
    const shareData = {
      title: `ProspectPro Analysis: ${data.url}`,
      text: `Website analysis for ${data.url} - Overall Score: ${data.overallScore.overall}/100`,
      url: window.location.href
    };
    
    // Share report
    navigator.share(shareData)
      .catch(error => {
        console.error('Error sharing report:', error);
      });
  } else {
    // Fallback - copy to clipboard
    const shareText = `ProspectPro Analysis: ${data.url}\nOverall Score: ${data.overallScore.overall}/100\nAnalyzed on: ${formatDate(new Date(data.timestamp || Date.now()))}`;
    
    navigator.clipboard.writeText(shareText)
      .then(() => {
        alert('Report details copied to clipboard!');
      })
      .catch(error => {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy report details. Please try again.');
      });
  }
}

// Utility Functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function showError(message) {
  // Create error element
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  // Add error element to results container
  elements.resultsContainer.innerHTML = '';
  elements.resultsContainer.appendChild(errorElement);
  elements.resultsContainer.classList.remove('hidden');
  
  // Remove error message after 5 seconds
  setTimeout(() => {
    if (elements.resultsContainer.contains(errorElement)) {
      errorElement.remove();
      
      // If there's no other content, hide results container
      if (elements.resultsContainer.childNodes.length === 0) {
        elements.resultsContainer.classList.add('hidden');
      }
    }
  }, 5000);
}

// Initialize app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initApp);