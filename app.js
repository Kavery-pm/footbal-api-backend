const express = require('express');
const axios = require('axios');
const app = express();
const endpoint = 'https://api.football-data.org/v2/';
const PORT = process.env.PORT || 8080;

axios.defaults.headers.common['X-Auth-Token'] = 'f1c71270d94d43dea19226a70a8c8818';
app.use((req, res, next) => {
  // Attach CORS headers
  // Required when using a detached backend (that runs on a different domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
async function getTeamId(name) {
  const response = await axios.get(endpoint + 'teams');
  const teams = response.data.teams;
  const team = teams.find(team => team.name === name);
  return team.id;
}
async function getTeamData(name) {
  const id = await getTeamId(name);
  const response = await axios.get(endpoint + `teams/${id}`);
  const team = response.data;
  return {
    name: team.name,
    address: team.address,
    phone: team.phone,
    website: team.website,
    logo: team.crestUrl
  };
}

async function getMatches(name, season) {
  const id = await getTeamId(name);
  const response = await axios.get(endpoint + `teams/${id}/matches?season=${season}`);
  const matches = response.data.matches;
  const stats = {
    won: 0,
    lost: 0,
    tied: 0,
    home: 0,
    away: 0,
    goals: 0,
    count: 0,
  };
  matches.forEach(match => {
    if (match.status === 'FINISHED') {
      stats.count++;
      stats.goals += match.score.fullTime.homeTeam + match.score.fullTime.awayTeam;
      if (match.homeTeam.id === id) {
        stats.home++;
        if (match.score.winner === 'HOME_TEAM') {
          stats.won++;
        } else if (match.score.winner === 'AWAY_TEAM') {
          stats.lost++;
        } else {
          stats.tied++;
        }
      } else {
        stats.away++;
        if (match.score.winner === 'AWAY_TEAM') {
          stats.won++;
        } else if (match.score.winner === 'HOME_TEAM') {
          stats.lost++;
        } else {
          stats.tied++;
        }
      }
    }
  });
  stats.average = stats.goals / stats.count;
  return stats;
}
app.get('/team/:name', async (req, res) => {
  const name = req.params.name;
  const team = await getTeamData(name);
  const matches = await getMatches(name, '2021');
  const otherTeams = await axios.get(endpoint + 'competitions/2021/teams');
  const teams = otherTeams.data.teams.filter(t => t.name !== name).slice(0, 3).map(t =>({name:t.name,id:t.id}) );
  console.log(teams)
  res.json({
    team,
    matches,
    teams,
  });
});
app.listen(PORT, () => {
  console.log('Server started on port');
});