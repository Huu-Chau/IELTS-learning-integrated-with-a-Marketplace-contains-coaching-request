const fs = require('fs');
['18', '19', '20'].forEach(book => {
  try {
    const data = JSON.parse(fs.readFileSync('src/database/mock-test/cambridge_' + book + '_reading.json'));
    const counts = data.tests.map(t => {
      let qc = 0;
      const parts = t.parts || t.passages || [];
      parts.forEach(p => {
        let qs = p.questions || [];
        if (!qs.length && p.sub_sections) {
           p.sub_sections.forEach(s => qs.push(...(s.questions || [])));
        }
        qc += qs.length;
      });
      return qc;
    });
    console.log('Book ' + book + ': ' + counts.join(', ') + ' -> Total: ' + counts.reduce((a,b)=>a+b, 0));
  } catch (e) {
    console.log('Error ' + book + ': ' + e.message);
  }
});
