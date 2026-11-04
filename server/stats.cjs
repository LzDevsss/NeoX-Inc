'use strict';
const GAMES=Object.freeze({10079271418:'ap',7660190629:'cr',7139435866:'ff'});
const ids=Object.keys(GAMES).join(',');
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e12?value:undefined;
function createStatsHandler({request=fetch,now=()=>Date.now()}={}){
  let saved=null,pending=null;
  async function json(url){const response=await request(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Roblox unavailable');return response.json();}
  async function refresh(){
    const [details,votes]=await Promise.allSettled([
      json(`https://games.roblox.com/v1/games?universeIds=${ids}`),
      json(`https://games.roblox.com/v1/games/votes?universeIds=${ids}`)
    ]);
    if(details.status!=='fulfilled'||!Array.isArray(details.value.data))throw new Error('Roblox unavailable');
    const games={},meta={};
    for(const item of details.value.data){
      const key=GAMES[item.id];if(!key)continue;
      const values={playing:number(item.playing),visits:number(item.visits),favorites:number(item.favoritedCount)};
      if(!Object.values(values).some(value=>value!==undefined))continue;
      games[key]=values;
      meta[key]={genre:String(item.genre||'').slice(0,40),maxPlayers:number(item.maxPlayers),updated:typeof item.updated==='string'?item.updated.slice(0,40):''};
    }
    if(!Object.keys(games).length)throw new Error('No valid data');
    if(votes.status==='fulfilled'&&Array.isArray(votes.value.data))for(const vote of votes.value.data){const key=GAMES[vote.id];if(key)Object.assign(games[key]||(games[key]={}),{likes:number(vote.upVotes),dislikes:number(vote.downVotes)});}
    saved={at:now(),data:{games,meta,updatedAt:new Date(now()).toISOString()}};
    return saved.data;
  }
  return async function stats(req,res){
    res.setHeader('Content-Type','application/json; charset=utf-8');
    const origin=req.headers.origin;
    if(origin==='https://eosein.github.io'||origin==='https://www.neoxinc.website'){
      res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'method_not_allowed'}));return;}
    try{
      let data=saved&&now()-saved.at<10000?saved.data:null;
      if(!data){
        if(!pending){pending=refresh();pending.then(()=>{pending=null;},()=>{pending=null;});}
        data=await pending;
      }
      res.statusCode=200;res.setHeader('Cache-Control','public, max-age=0, s-maxage=10, stale-while-revalidate=30');
      res.end(req.method==='HEAD'?'':JSON.stringify(data));
    }catch{
      res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','30');
      res.end(JSON.stringify({error:'stats_unavailable'}));
    }
  };
}
module.exports={createStatsHandler};
