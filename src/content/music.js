// Selected from smdz2009's shared playlist, verified 2026-09-12.
// Use the official public playback endpoint; never store expiring CDN URLs.
export const playlistUrl='https://music.163.com/playlist?id=7756494684';
export const musicTracks=[
 {id:1426649237,name:'海底',artist:'一支榴莲'},
 {id:2044458035,name:'我的歌声里',artist:'曲婉婷'},
 {id:3392551456,name:'一城山水',artist:'陈与默'},
 {id:1359382613,name:'我愿',artist:'阿虾'},
 {id:566436427,name:'谁 (Live版)',artist:'廖俊涛'},
].map(track=>({...track,remote:true,url:`https://music.163.com/song/media/outer/url?id=${track.id}.mp3`,link:`https://music.163.com/song?id=${track.id}`}));
