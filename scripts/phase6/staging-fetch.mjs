import {spawnSync} from 'node:child_process';
import {ORIGIN,check} from '../phase1-hosted-closeout-config.mjs';

// Curl provides a bounded transport where the local Node TLS connection times out.
// Credentials stay in standard input and are sent only to the verified staging origin.
export async function stagingFetch(input,init={}) {
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 check(new URL(url).origin===ORIGIN,'Unexpected hosted destination.');
 const headers=new Headers(init.headers??(input instanceof Request?input.headers:undefined));
 const method=init.method??(input instanceof Request?input.method:'GET');
 const body=init.body??(input instanceof Request&&method!=='GET'&&method!=='HEAD'?await input.clone().text():undefined);
 check(body===undefined||body===null||typeof body==='string','Only JSON/text staging requests are supported.');
 const quote=value=>JSON.stringify(String(value));
 const configuration=[`url = ${quote(url)}`,`request = ${quote(method)}`,...Array.from(headers,([key,value])=>`header = ${quote(`${key}: ${value}`)}`),...(body==null?[]:[`data-binary = ${quote(body)}`])].join('\n');
 const result=spawnSync('curl',[method==='HEAD'?'--head':'--include','--silent','--show-error','--connect-timeout','10','--max-time','20','--write-out','\n%{http_code}','--config','-'],{input:configuration,encoding:'utf8',timeout:22000,maxBuffer:8*1024*1024});
 check(result.status===0,'Staging transport unavailable; private diagnostics withheld.');
 const split=result.stdout.lastIndexOf('\n'),status=Number(result.stdout.slice(split+1));
 check(status>=200&&status<=599,'Invalid staging HTTP response.');
 let payload=result.stdout.slice(0,split),responseHeaders=new Headers();
 while(payload.startsWith('HTTP/')){
  const end=payload.indexOf('\r\n\r\n');check(end>=0,'Invalid staging HTTP headers.');
  responseHeaders=new Headers();for(const line of payload.slice(0,end).split('\r\n').slice(1)){
   const colon=line.indexOf(':');if(colon>0)responseHeaders.append(line.slice(0,colon).trim(),line.slice(colon+1).trim());
  }
  payload=payload.slice(end+4);
 }
 return new Response(method==='HEAD'||[204,205,304].includes(status)?null:payload,{status,headers:responseHeaders});
}
