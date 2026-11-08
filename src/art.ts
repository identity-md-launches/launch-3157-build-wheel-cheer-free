export const icons: Record<string, string> = {
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M15 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  heart:
    '<path d="M20 5c-2-2-6-2-8 1-2-3-6-3-8-1-3 3-2 6 1 9l7 6 7-6c3-3 4-6 1-9Z"/>',
  volume:
    '<path d="M11 4 6 8H3v8h3l5 4V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H3v8h3l5 4V4Zm5 5 5 6m0-6-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  chat: '<path d="M4 3h17v12l-5 5h-5l-3 3v-3H4V3Zm4 4v6m6-6v6"/>',
  wheel:
    '<circle cx="12" cy="11" r="8"/><path d="M12 3v16M4 11h16M6.5 5.5l11 11m0-11-11 11M9 22h6m-3-3v3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
  link: '<path d="m10 13 4-4m-7 6-2 2a4 4 0 0 0 6 6l3-3a4 4 0 0 0 0-6M14 9l2-2a4 4 0 0 0-6-6L7 4a4 4 0 0 0 0 6" transform="translate(1 0) scale(.9)"/>',
  sparkle:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
};
export function icon(name: string, className = ""): string {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.wheel}</svg>`;
}
export function hamsterLogo(): string {
  return `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" class="brand-hamster" shape-rendering="crispEdges"><path fill="#CA874E" d="M9 15V6h10v7h11V6h10v12h3v18h-5v5H12v-5H6V18h3Z"/><path fill="#F5BA69" d="M12 8h5v9h14V8h6v13h4v12h-6v5H14v-5H9V21h3Z"/><path fill="#FBE7BE" d="M18 24h15v4h5v7h-7v4H18v-4h-7v-7h7Z"/><path fill="#E89C93" d="M12 9h4v7h-4zm20 0h4v7h-4zM23 27h5v4h-5Z"/><path fill="#382B2A" d="M16 20h4v5h-4zm15 0h4v5h-4zm-7 12h3v3h-3Z"/><path fill="#FFF7E3" d="M16 20h1v1h-1zm15 0h1v1h-1Z"/></svg>`;
}
export function wheelArt(): string {
  return `<svg class="wheel-art" viewBox="0 0 128 128" role="img" aria-label="Squeektoshi the pixel-art hamster on a wheel" shape-rendering="crispEdges">
 <ellipse cx="64" cy="119" rx="41" ry="5" fill="#11141D" opacity=".22"/>
 <path d="M56 91h16v24h13v7H43v-7h13Z" fill="#658F87"/><path d="M61 94h6v21h-6Z" fill="#9AD5BD"/>
 <path d="M45 8h38v5h15v9h10v15h6v39h-6v15H98v10H83v6H45v-6H30V91H20V76h-6V37h6V22h10v-9h15Z" fill="#263E40"/>
 <path d="M45 12h38v5h13v9h9v13h5v35h-5v15h-9v8H81v6H47v-6H33v-8h-9V74h-6V39h6V26h9v-9h12Z" fill="#9AD5BD"/>
 <path d="M46 18h35v5h12v8h7v12h5v28h-5v14h-9v7H79v5H49v-5H36v-9h-7V70h-5V44h5V31h9v-8h8Z" fill="#26383D"/>
 <g class="wheel-rotor" opacity=".52" fill="#6FAD9E"><path d="M61 21h6v73h-6zM27 54h74v6H27z"/><path d="m38 29 4-4 50 57-4 4ZM90 29l4 4-55 53-4-4Z"/><path d="M46 15h6v5h-6zm32 0h6v5h-6zm25 27h6v5h-6zm0 28h6v5h-6zM78 96h6v5h-6zm-32 0h6v5h-6zM20 42h6v5h-6zm0 28h6v5h-6z"/></g>
 <path d="M61 53h7v7h-7z" fill="#BCE8CF"/>
 <g class="hamster-sprite">
 <path d="M37 70h9v-8h8v-4h17v4h10v8h9v9h5v14h-7v7H49v-4H37V84h-5V74h5Z" fill="#845C42"/>
 <path d="M40 70h10v-7h9v4h11v-5h8v11h10v9h4v9h-8v5H52v-4H40V82h-4v-8h4Z" fill="#E5A261"/>
 <path d="M52 74h21v-5h6v9h8v13H74v5H54v-5H44v-9h8Z" fill="#FFE1AC"/>
 <path d="M51 64h6v7h-6zm20 0h5v7h-5zm13 21h7v5h-7Z" fill="#E99E8D"/>
 <path class="eye-open" d="M76 75h5v6h-5Z" fill="#372B2A"/><path class="eye-open" d="M76 75h2v2h-2Z" fill="#FFF3DA"/>
 <path class="eye-sleep" d="M73 78h9v3h-9Z" fill="#372B2A"/>
 <path d="M88 80h6v4h-6ZM36 83h5v5h-5Z" fill="#B77750"/>
 <g class="paws" fill="#C18354"><path d="M50 96h10v5H49v-5Zm23-1h10v6H72v-6Z"/></g>
 </g>
 <g class="sleep-z" fill="#BCE8CF"><path d="M85 42h12v4h-4v4h-4v3h8v4H83v-4h4v-4h4v-3h-6Zm17-16h9v3h-3v3h-3v2h6v3h-10v-3h3v-3h3v-2h-5Z"/></g>
 </svg>`;
}
export function sceneArt(): string {
  return `<svg class="stream-scene" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true" shape-rendering="crispEdges">
 <rect width="960" height="540" fill="#292C43"/>
 <path fill="#333A52" d="M0 155h80v-18h70v14h100v-24h110v14h80v-18h200v20h80v-15h100v16h140v100H0Z"/>
 <g fill="#B7B4A3" opacity=".6"><path d="M106 66h3v3h-3zm146-29h3v3h-3zm175 50h3v3h-3zm86-48h3v3h-3zm249 33h3v3h-3zm109-38h3v3h-3zM33 111h3v3h-3zm286-31h3v3h-3z"/></g>
 <path d="M655 46h46v8h14v14h8v43h-8v14h-14v8h-46v-8h-14v-14h-8V68h8V54h14Z" fill="#E7D8A9"/>
 <path d="M686 46h15v8h14v14h8v43h-8v14h-14v8h-16v-8h-11v-14h-8V68h8V54h12Z" fill="#D2C69F"/>
 <path d="M0 221h46v-24h44v-24h38v-35h40v-19h34v24h30v28h32v22h56v24h60v30H0ZM339 239h37v-24h44v-23h36v-32h44v-27h34v29h28v27h29v23h39v37h45v27H339ZM626 247h43v-25h39v-28h44v-29h37v-21h30v29h32v24h36v23h38v32h35v36H626Z" fill="#3A4B59"/>
 <path d="M0 268h47v-24h42v21h72v-18h70v28h104v-15h97v12h82v-24h71v18h82v-24h98v19h80v-20h57v25h58v274H0Z" fill="#395B5C"/>
 <path d="M0 325h74v-17h92v13h84v-15h105v19h92v-12h104v-15h121v17h121v-15h85v20h82v220H0Z" fill="#496D62"/>
 <path d="M0 379h152v-14h134v-16h123v14h144v-15h150v15h112v-12h145v189H0Z" fill="#67856A"/>
 <path d="M0 450h78v-15h158v-17h170v-16h145v13h128v12h137v-13h144v126H0Z" fill="#859572"/>
 <path d="M382 348h56v20h-20v19h-37v21h-31v15h-54v21h-58v15h-89v21H0v60h375v-26h40v-24h44v-24h42v-20h45v-22h-84v-18h-28v-17h-18v-17h-34Z" fill="#8EADA2"/>
 <path d="M382 354h24v16h12v19h-24v22h-42v16h-43v20h-58v16h-90v20H0v21h171v-14h102v-19h80v-22h43v-20h39v-18h-21v-20h-16v-17h-16Z" fill="#BDD1AF"/>
 <g fill="#364F48"><path d="M119 148h12v25h13v20h17v22h-16v15h24v24h-20v12h29v25h-38v29h-18v-29H81v-25h24v-12H89v-24h22v-15H94v-22h15v-20h10Z"/><path d="M76 201h10v20h13v20h14v23H96v14h22v22H88v29H72v-29H44v-22h17v-14H48v-23h14v-20h14Z"/></g>
 <g fill="#253E3C"><path d="M901 110h14v28h15v26h16v27h14v34h-24v19h24v31h-33v21h33v38h-60v56h-20v-56h-61v-38h34v-21h-28v-31h27v-19h-21v-34h20v-27h17v-26h13Z"/><path d="M814 194h12v22h14v23h17v26h19v27h-27v17h29v28h-51v44h-19v-44h-43v-28h21v-17h-17v-27h19v-26h13v-23h13Z"/></g>
 <path d="M680 264h133v108H680Z" fill="#A67F60"/><path d="M672 262v-15h19v-17h21v-17h21v-17h30v17h20v17h21v17h20v15Z" fill="#644A47"/><path d="M685 262v-10h15v-16h20v-15h19v-12h19v14h19v15h19v16h18v8Z" fill="#896053"/>
 <path d="M745 288h35v42h-35Z" fill="#F2C27E"/><path d="M760 288h5v42h-5Zm-15 18h35v5h-35Z" fill="#9F7556"/><path d="M697 309h27v63h-27Z" fill="#684D43"/><path d="M716 338h4v4h-4Z" fill="#E8B978"/>
 <path d="M690 373h28v11h-28zm-28 20h29v11h-29zm-20 22h33v11h-33zm-28 24h32v11h-32Z" fill="#D1B28A"/>
 <g fill="#B8BA83"><path d="M471 382h5v9h-5zm40-18h5v9h-5zm66 32h5v9h-5zm-25 54h5v9h-5zm237-40h5v9h-5zm-64 58h5v9h-5z"/></g>
 <g fill="#395848"><path d="M0 476h17v-16h9v16h15v23h18v41H0Zm722 64v-34h16v-23h9v23h16v-34h9v34h17v-13h10v47Zm105 0v-37h17v-19h9v19h20v-33h9v33h20v-17h9v17h25v-31h10v31h14v37Z"/></g>
 <g fill="#CCB48B"><path d="M569 462h22v9h-22zm-16 9h55v11h-55zm277-94h24v8h-24Z"/></g>
 <g fill="#263E3C"><path d="M40 378h9v30h11v-21h9v43H52v-13H40Zm502-47h7v19h9v-13h6v31h-16v-9h-6Zm296 101h9v15h11v-24h7v34h-19v-8h-8Z"/></g>
 </svg>`;
}
