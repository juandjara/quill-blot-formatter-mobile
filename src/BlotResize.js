// @flow

import deepmerge from 'deepmerge';
import type { BlotResizeOptions } from './Options';
import DefaultOptions from './Options';
import Action from './actions/Action';
import { BlotSpec } from './specs/BlotSpec';

const dontMerge = (destination: Array<any>, source: Array<any>) => source;

export default class BlotResize {
  quill: any;
  options: BlotResizeOptions;
  currentSpec: ?BlotSpec;
  overlay: HTMLElement;
  actions: Action[];

  constructor(quill: any, options: $Shape<BlotResizeOptions> = {}) {
    this.quill = quill;
    this.options = deepmerge(DefaultOptions, options, { arrayMerge: dontMerge });
    this.currentSpec = null;
    this.actions = [];
    this.overlay = document.createElement('div');
    this.overlay.classList.add(this.options.overlay.className);
    if (this.options.overlay.styled) {
      Object.assign(this.overlay.style, this.options.overlay.styles);
    }

    // disable native image resizing on firefox
    document.execCommand('enableObjectResizing', false, 'false'); // eslint-disable-line no-undef
    this.quill.root.parentNode.style.position = this.quill.root.parentNode.style.position || 'relative';
    this.quill.root.addEventListener('click', this.onClick, false);
  }

  show(spec: Class<BlotSpec>, el: HTMLElement) {
    this.currentSpec = spec.create(el);
    this.quill.setSelection(null);
    this.setUserSelect('none');
    this.quill.root.parentNode.appendChild(this.overlay);
    this.repositionOverlay();
    this.createActions();
  }

  hide() {
    if (!this.currentSpec) {
      return;
    }

    this.currentSpec = null;
    this.quill.root.parentNode.removeChild(this.overlay);
    this.overlay.style.setProperty('display', 'none');
    this.setUserSelect('');
    this.destroyActions();
  }

  createActions() {
    this.actions = this.options.actions.map((ActionClass: Class<Action>) => {
      const action: Action = new ActionClass(this);
      action.onCreate();
      return action;
    });
  }

  destroyActions() {
    this.actions.forEach((action: Action) => action.onDestroy());
    this.actions = [];
  }

  repositionOverlay() {
    if (!this.currentSpec) {
      return;
    }

    const parent: HTMLElement = this.quill.root.parentNode;
    const specRect = this.currentSpec.getOverlayTarget().getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    Object.assign(this.overlay.style, {
      display: 'block',
      left: `${specRect.left - parentRect.left - 1 + parent.scrollLeft}px`,
      top: `${specRect.top - parentRect.top + parent.scrollTop}px`,
      width: `${specRect.width}px`,
      height: `${specRect.height}px`,
    });
  }

  setUserSelect(value: string) {
    const props: string[] = [
      'userSelect',
      'mozUserSelect',
      'webkitUserSelect',
      'msUserSelect',
    ];

    props.forEach((prop: string) => {
      // set on contenteditable element and <html>
      this.quill.root.style.setProperty(prop, value);
      if (document.documentElement) {
        document.documentElement.style.setProperty(prop, value);
      }
    });
  }

  onClick = (event: Event) => {
    const nextEl = event.target;
    if (!(nextEl instanceof HTMLElement)) {
      return;
    }

    let nextSpec: ?Class<BlotSpec> = null;

    this.options.specs.forEach((spec: Class<BlotSpec>) => {
      if (spec.canHandle(nextEl)) {
        nextSpec = spec;
      }
    });

    if (!nextSpec) {
      this.hide();
      return;
    }

    // TODO: do we need to check if we're already focused?

    if (this.currentSpec) {
      this.hide();
    }

    this.show(nextSpec, nextEl);
  }
}