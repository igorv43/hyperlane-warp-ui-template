export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050508]">
      {/* Real NASA/ISS photo (public domain) — Earth's limb at night, city lights + stars */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/backgrounds/earth-night-final.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: '70% 35%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Brand-color grade: push the photo toward blue/purple and darken the left side for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(115deg, rgba(5,5,8,0.9) 0%, rgba(8,10,22,0.7) 30%, rgba(8,10,22,0.3) 55%, rgba(8,10,22,0.1) 100%),
            radial-gradient(ellipse 900px 700px at 10% 15%, rgba(39,100,193,0.3), transparent 70%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: 'linear-gradient(200deg, rgba(90,60,200,0.25), rgba(39,100,193,0.15) 40%, transparent 70%)',
          mixBlendMode: 'color',
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse 700px 500px at 85% 65%, rgba(47,205,178,0.4), transparent 65%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Extra scattered stars on the left/dark side, to match density across the whole frame */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `
            radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 90px 150px, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 160px 60px, rgba(255,255,255,0.95), transparent),
            radial-gradient(1px 1px at 230px 200px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1.5px 1.5px at 280px 100px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 40px 220px, rgba(255,255,255,0.55), transparent),
            radial-gradient(2.5px 2.5px at 340px 40px, rgba(190,210,255,0.9), transparent),
            radial-gradient(1px 1px at 120px 10px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 370px 170px, rgba(255,255,255,0.7), transparent)
          `,
          backgroundSize: '400px 260px',
          backgroundRepeat: 'repeat',
          maskImage: 'linear-gradient(115deg, black 0%, black 45%, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(115deg, black 0%, black 45%, transparent 75%)',
        }}
      />
    </div>
  );
}
