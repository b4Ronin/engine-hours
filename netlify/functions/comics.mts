import { getStore } from "@netlify/blobs";
const store=()=>getStore("comic-vault",{consistency:"strong"});
const json=(v:any,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const norm=(v:any)=>String(v||"").replace(/\D/g,"");
export default async(req:Request)=>{
 try{
  const s=store(),u=new URL(req.url),p=u.pathname.split("/").filter(Boolean),i=p.lastIndexOf("comics"),r=i>=0?p.slice(i+1):[];
  if(req.method==="GET"&&r[0]==="health"){await s.set("health.txt","ok");const v=await s.get("health.txt");return json({ok:v==="ok",storage:"netlify-blobs"});}
  if(req.method==="GET"&&r[0]==="image"&&r[1]){const b=await s.get("comic-images/"+norm(r[1]),{type:"blob"});return b?new Response(b,{headers:{"content-type":b.type||"image/jpeg","cache-control":"public,max-age=86400"}}):new Response("",{status:404});}
  if(req.method==="GET"){const a=await s.get("collection.json",{type:"json"})||[];return json(a);}
  const key=process.env.COMIC_VAULT_API_KEY||"";if(!key||req.headers.get("authorization")!=="Bearer "+key)return json({error:"Unauthorized"},401);
  if(req.method==="POST"&&r[0]==="image"&&r[1]){const cert=norm(r[1]),b=await req.blob();if(!cert||!b.size)return json({error:"Invalid image"},400);await s.set("comic-images/"+cert,b);return json({ok:true,certNumber:cert});}
  if(req.method==="POST"){const c=await req.json(),cert=norm(c.certNumber);if(!cert)return json({error:"Certification number required"},400);const a:any[]=await s.get("collection.json",{type:"json"})||[];const n={...c,certNumber:cert};const x=a.findIndex(v=>norm(v.certNumber)===cert);if(x>=0)a[x]={...a[x],...n};else a.push(n);await s.setJSON("collection.json",a);return json(n,x>=0?200:201);}
  return json({error:"Method not allowed"},405);
 }catch(e:any){console.error(e);return json({error:"Vault error",detail:String(e?.message||e)},500);}
};