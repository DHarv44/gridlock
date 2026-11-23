// What the radio shows: the station name across the top when you tune, and a "now playing" card
// (title, artist, station) in the top left when a song starts. The card sits under the job panel
// when one is up, and goes when you leave the vehicle.
const BANNER_S = 2.6;
const CARD_S = 7;

export class RadioDisplay {
  private banner = document.createElement('div');
  private bannerT = 0;
  private card = document.createElement('div');
  private cardT = 0;

  constructor() {
    this.banner.className = 'radio-banner';
    this.banner.hidden = true;
    document.body.appendChild(this.banner);
    this.card.className = 'now-playing';
    this.card.innerHTML = '<div class="np-title"></div><div class="np-artist"></div>';
    document.body.appendChild(this.card);
  }

  show(text: string, color: string): void {
    this.banner.textContent = text;
    this.banner.style.color = color;
    this.banner.hidden = false;
    this.bannerT = BANNER_S;
  }

  nowPlaying(title: string, line: string, color: string): void {
    this.card.querySelector('.np-title')!.textContent = title;
    this.card.querySelector('.np-artist')!.textContent = line;
    this.card.style.setProperty('--np', color);
    const job = document.querySelector('.hud-mission')?.getBoundingClientRect();
    this.card.style.top = job && job.height > 0 ? `${Math.round(job.bottom + 10)}px` : '';
    this.card.classList.add('on');
    this.cardT = CARD_S;
  }

  hideCard(): void {
    this.cardT = 0;
    this.card.classList.remove('on');
  }

  update(dt: number, inVehicle: boolean): void {
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) this.banner.hidden = true;
    if (this.cardT > 0 && ((this.cardT -= dt) <= 0 || !inVehicle)) this.hideCard();
  }
}
