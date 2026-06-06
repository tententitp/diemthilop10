// Dynamically compute badges from `window.DIEM_THI` to ensure accuracy.
// Badges supported:
// - "Thủ khoa" (rank 1)
// - "Á khoa" (rank 2)
// - "Top 10" (rank <= 10)
// - "Top N" (explicit rank)
// - "Điểm cao nhất môn Văn/Anh/Toán" (per-subject max; ties allowed)
// - "Điểm cao nhất cả 3 môn" (highest total)
(function(){
  try {
    const data = window.DIEM_THI || [];
    const map = {};
    if (!data || !data.length) { window.DIEM_BADGES = map; return; }
    const toNum = (v) => Number(v) || 0;
    const maxV = Math.max(...data.map(d => toNum(d.Văn)));
    const maxA = Math.max(...data.map(d => toNum(d.Anh)));
    const maxT = Math.max(...data.map(d => toNum(d.Toán)));
    const maxTotal = Math.max(...data.map(d => toNum(d.Tổng)));

    // sort by total desc, tie-breaker STT asc
    const sorted = [...data].sort((a,b) => {
      if (toNum(b.Tổng) !== toNum(a.Tổng)) return toNum(b.Tổng) - toNum(a.Tổng);
      return (Number(a.STT) || 0) - (Number(b.STT) || 0);
    });

    sorted.forEach((s, idx) => {
      const sbd = String(s.SBD || '').trim();
      if (!sbd) return;
      const badges = [];
      const rank = idx + 1;
      // Priority order: Thủ khoa / Á khoa -> per-subject highest -> 'Điểm cao nhất cả 3 môn' -> Top-N -> Top rank -> 'Vượt qua'
      if (rank === 1) badges.push('Thủ khoa');
      if (rank === 2) badges.push('Á khoa');

      // per-subject highest first
      if (toNum(s.Văn) === maxV) badges.push('Điểm cao nhất môn Văn');
      if (toNum(s.Anh) === maxA) badges.push('Điểm cao nhất môn Anh');
      if (toNum(s.Toán) === maxT) badges.push('Điểm cao nhất môn Toán');

      // only mark 'Điểm cao nhất cả 3 môn' if this student has the per-subject max in all three subjects
      if (toNum(s.Văn) === maxV && toNum(s.Anh) === maxA && toNum(s.Toán) === maxT) {
        badges.push('Điểm cao nhất cả 3 môn');
      }

      // then Top categories (only for rank <= 50)
      if (rank <= 50) {
        if (rank <= 5) badges.push('Top 5');
        else if (rank <= 10) badges.push('Top 10');
        badges.push(`Top ${rank}`);
      }

      // finally, 'Vượt qua' should be appended last when applicable
      if (rank > 50 && toNum(s.Tổng) >= 14.25) {
        badges.push('Vượt qua');
      }
      // dedupe and if there are multiple `Top N` badges, keep only the smallest N (best rank)
      let uniq = Array.from(new Set(badges));
      try {
        const topBadges = uniq.filter(b => /^Top\s*\d+/i.test(b));
        if (topBadges.length) {
          const topNums = topBadges.map(b => parseInt((b.match(/\d+/)||[0])[0], 10)).filter(n => !isNaN(n));
          if (topNums.length) {
            const minTop = Math.min(...topNums);
            uniq = uniq.filter(b => {
              if (/^Top\s*\d+/i.test(b)) return parseInt((b.match(/\d+/)||[0])[0], 10) === minTop;
              return true;
            });
          }
        }
      } catch (e) { /* ignore parsing errors */ }
      map[sbd] = uniq;
    });

    // ensure deduped arrays stored
    Object.keys(map).forEach(k => {
      // normalize and enforce Top-N smallest rule again
      const arr = map[k] || [];
      let dedup = Array.from(new Set(arr));
      try {
        const topBadges = dedup.filter(b => /^Top\s*\d+/i.test(b));
        if (topBadges.length) {
          const topNums = topBadges.map(b => parseInt((b.match(/\d+/)||[0])[0], 10)).filter(n => !isNaN(n));
          if (topNums.length) {
            const minTop = Math.min(...topNums);
            dedup = dedup.filter(b => {
              if (/^Top\s*\d+/i.test(b)) return parseInt((b.match(/\d+/)||[0])[0], 10) === minTop;
              return true;
            });
          }
        }
      } catch (e) { /* ignore */ }
      map[k] = dedup;
    });

    window.DIEM_BADGES = map;
  } catch (e) {
    console.warn('Failed to compute DIEM_BADGES dynamically', e);
    window.DIEM_BADGES = window.DIEM_BADGES || {};
  }
})();
