const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distFile = path.join(__dirname, 'index.html');

console.log('Building index.html...');

try {
  // Read layout
  let layout = fs.readFileSync(path.join(srcDir, 'layout.html'), 'utf8');

  // Read styles and scripts
  const style = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
  const script = fs.readFileSync(path.join(srcDir, 'script.js'), 'utf8');

  // Read components
  const hero = fs.readFileSync(path.join(srcDir, 'components', 'hero.html'), 'utf8');
  const links = fs.readFileSync(path.join(srcDir, 'components', 'links.html'), 'utf8');
  const bestsellers = fs.readFileSync(path.join(srcDir, 'components', 'bestsellers.html'), 'utf8');
  const brandStatement = fs.readFileSync(path.join(srcDir, 'components', 'brand_statement.html'), 'utf8');
  const tabs = fs.readFileSync(path.join(srcDir, 'components', 'tabs.html'), 'utf8');
  const shoppingTip = fs.readFileSync(path.join(srcDir, 'components', 'shopping_tip.html'), 'utf8');
  const trustBadges = fs.readFileSync(path.join(srcDir, 'components', 'trust_badges.html'), 'utf8');
  const footer = fs.readFileSync(path.join(srcDir, 'layout', 'footer.html'), 'utf8');

  // Replace placeholders in layout
  layout = layout.replace('/* {{STYLE}} */', style);
  layout = layout.replace('// {{SCRIPT}}', script);
  layout = layout.replace('<!-- {{HERO}} -->', hero);
  layout = layout.replace('<!-- {{LINKS}} -->', links);
  layout = layout.replace('<!-- {{BESTSELLERS}} -->', bestsellers);
  layout = layout.replace('<!-- {{BRAND_STATEMENT}} -->', brandStatement);
  layout = layout.replace('<!-- {{TABS}} -->', tabs);
  layout = layout.replace('<!-- {{SHOPPING_TIP}} -->', shoppingTip);
  layout = layout.replace('<!-- {{TRUST_BADGES}} -->', trustBadges);
  layout = layout.replace('<!-- {{FOOTER}} -->', footer);

  // Write to root index.html
  fs.writeFileSync(distFile, layout, 'utf8');
  console.log('Successfully built index.html!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
