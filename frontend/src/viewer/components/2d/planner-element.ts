import { css, CSSResult, customElement, html, internalProperty, LitElement, TemplateResult } from 'lit-element';
import { connect } from 'pwa-helpers';

import { Score } from '../../logic/score/scorer';
import { formatUnit, Units } from '../../logic/units';
import { decrementSpeed, incrementSpeed, setSpeed } from '../../redux/planner-slice';
import { RootState, store } from '../../redux/store';

const ICON_MINUS =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEX///9xe4e/5menAAAAE0lEQVQImWP438DQAEP7kNj/GwCK4wo9HA2mvgAAAABJRU5ErkJggg==';
const ICON_PLUS =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJAQMAAADaX5RTAAAABlBMVEX///9xe4e/5menAAAAGElEQVQImWP438DQ0MDQAUb7YAygyP8GAIyjCl0WJTcvAAAAAElFTkSuQmCC';
const ICON_COLLAPSE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAADAQAAAABzTfhVAAAADklEQVQImWO4wdDBwAAABdYBYfESkFcAAAAASUVORK5CYII=';
const ICON_EXPAND =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAADAQAAAABzTfhVAAAADklEQVQImWNgYOhguAEAAnYBYaFuVa4AAAAASUVORK5CYII=';

@customElement('planner-element')
export class PlannerElement extends connect(store)(LitElement) {
  @internalProperty()
  private score?: Score;
  @internalProperty()
  private speed = 20;
  @internalProperty()
  private units?: Units;
  @internalProperty()
  private distance = 0;
  @internalProperty()
  private hideDetails = store.getState().browser.isSmallScreen;
  @internalProperty()
  private isFreeDrawing = false;

  private duration?: number;
  private readonly closeHandler = () => this.dispatchEvent(new CustomEvent('close-flight'));
  private readonly shareHandler = () => this.dispatchEvent(new CustomEvent('share'));
  private readonly downloadHandler = () => this.dispatchEvent(new CustomEvent('download'));
  private readonly resetHandler = () => this.dispatchEvent(new CustomEvent('reset'));
  private readonly drawHandler = () => this.dispatchEvent(new CustomEvent('draw-route'));

  stateChanged(state: RootState): void {
    this.distance = state.planner.distance;
    this.score = state.planner.score;
    this.speed = state.planner.speed;
    this.units = state.units;
    this.duration = ((this.distance / this.speed) * 60) / 1000;
    this.isFreeDrawing = state.planner.isFreeDrawing;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        opacity: 0.9;
        user-select: none;
      }
      .control {
        user-select: none;
        text-align: center;
        position: relative;
        box-shadow: rgba(0, 0, 0, 0.4), 0, 2px, 4px;
        background-color: #fff;
        border-radius: 4px;
        color: #000;
        font-size: 13px;
        margin: 0 5px;
        min-width: 106px;
        cursor: pointer;
        min-height: 2em;
      }

      .control > div {
        border: solid 1px #717b87;
        border-top: 0;
        padding: 4px;
      }

      .control > :first-child {
        border-radius: 4px 4px 0 0;
        border-top: solid 1px #717b87;
        padding: 4px 0px;
      }

      .control > :last-child {
        border-radius: 0 0 4px 4px;
      }

      .large {
        font-size: 24px !important;
        font-weight: bold !important;
        overflow: hidden;
      }

      .decrement {
        float: left;
        padding-left: 6px;
      }

      .increment {
        float: right;
        padding-right: 6px;
      }
    `;
  }

  protected render(): TemplateResult {
    if (this.score == null || this.units == null) {
      return html``;
    }
    return html`
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/line-awesome@1/dist/line-awesome/css/line-awesome.min.css"
      />
      <style>
        .collapsible {
          display: ${this.hideDetails ? 'none' : 'block'};
        }
        .active {
          background-color: lightgray;
        }
      </style>
      <div class="control">
        <div>
          <div>${this.score.circuit}</div>
          <div class="large">${formatUnit(this.score.distance / 1000, this.units.distance)}</div>
        </div>
        <div class="collapsible">
          <div>Points = ${this.getMultiplier()}</div>
          <div class="large">${this.score.points.toFixed(1)}</div>
        </div>
        <div class="collapsible">
          <div>Total distance</div>
          <div class="large">${formatUnit(this.distance / 1000, this.units.distance)}</div>
        </div>
        <div
          class="collapsible"
          @mousemove=${this.onMouseMove}
          @click=${this.changeDuration}
          @wheel=${this.wheelDuration}
        >
          <div>
            <span>Duration</span>
            <div class="decrement">
              <img alt="Reduce duration" src=${ICON_MINUS} height="9" width="9" />
            </div>
            <div class="increment">
              <img alt="Increase duration" src=${ICON_PLUS} height="9" width="9" />
            </div>
          </div>
          <div class="large">${this.getDuration()}</div>
        </div>
        <div class="collapsible" @mousemove=${this.onMouseMove} @click=${this.changeSpeed} @wheel=${this.wheelSpeed}>
          <div>
            <span>Speed</span>
            <div class="decrement">
              <img alt="Reduce speed" src=${ICON_MINUS} height="9" width="9" />
            </div>
            <div class="increment">
              <img alt="Increase speed" src=${ICON_PLUS} height="9" width="9" />
            </div>
          </div>
          <div class="large">${formatUnit(this.speed as number, this.units.speed)}</div>
        </div>
        <div @click=${this.drawHandler} class=${this.isFreeDrawing ? 'active' : ''}>
          <div><i class="las la-pen"></i> Free draw</div>
        </div>
        <div class="collapsible" @click=${this.closeHandler}>
          <div>Close flight</div>
        </div>
        <div class="collapsible" @click=${this.shareHandler}>
          <div>Share</div>
        </div>
        <div class="collapsible" @click=${this.downloadHandler}>
          <div>Download</div>
        </div>
        <div class="collapsible" @click=${this.resetHandler}>
          <div>Reset</div>
        </div>
        <div @click=${() => (this.hideDetails = !this.hideDetails)}>
          <div>
            ${this.hideDetails
              ? html` <img height="5" width="8" src=${ICON_EXPAND} /> `
              : html` <img height="5" width="8" src=${ICON_COLLAPSE} /> `}
          </div>
        </div>
      </div>
    `;
  }

  private getMultiplier() {
    return this.score?.multiplier == 1 ? 'kms' : `${this.score?.multiplier} x kms`;
  }

  private getDuration(): string {
    const duration = this.duration as number;
    const hour = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60).toString();
    return `${hour}:${minutes.padStart(2, '0')}`;
  }

  private onMouseMove(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const x = e.clientX - target.getBoundingClientRect().left;
    const width = target.clientWidth;
    target.style.cursor = x > width / 2 ? 'n-resize' : 's-resize';
  }

  private changeDuration(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const x = e.clientX - target.getBoundingClientRect().left;
    const width = target.clientWidth;
    const delta = x > width / 2 ? 1 : -1;
    const duration = (Math.floor((this.duration as number) / 15) + delta) * 15;
    store.dispatch(setSpeed(this.distance / ((1000 * Math.max(15, duration)) / 60)));
  }

  private wheelDuration(e: WheelEvent): void {
    const delta = Math.sign(e.deltaY);
    const duration = (Math.floor((this.duration as number) / 15) + delta) * 15;
    store.dispatch(setSpeed(this.distance / ((1000 * Math.max(15, duration)) / 60)));
  }

  private changeSpeed(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const x = e.clientX - target.getBoundingClientRect().left;
    const width = target.clientWidth;
    store.dispatch(x > width / 2 ? incrementSpeed() : decrementSpeed());
  }

  private wheelSpeed(e: WheelEvent): void {
    store.dispatch(e.deltaY > 0 ? incrementSpeed() : decrementSpeed());
  }
}
