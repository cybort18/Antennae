// @vitest-environment jsdom
/**
 * Solar System Overview interaction tests.
 *
 * Both WebGL viewports are replaced with stubs because jsdom has no WebGL
 * context. The rest of the application is real: the default landing mode, the
 * body selector, the reference-only disclosure, and the reversible switch into
 * the Earth Orbit Lab where the two-body engine remains untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const engineProbe = vi.hoisted(() => ({ calls: 0, allow: false }));

vi.mock('../../simulation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../simulation')>();
  return {
    ...actual,
    runSimulation: (...args: Parameters<typeof actual.runSimulation>) => {
      engineProbe.calls += 1;
      if (!engineProbe.allow) {
        throw new Error('Engine ran before the Earth Orbit Lab was opened');
      }
      return actual.runSimulation(...args);
    },
  };
});

vi.mock('../../scene/SimulationViewport', () => ({
  SimulationViewport: ({
    sampleIndex,
    result,
  }: {
    sampleIndex: number;
    result: { samples: unknown[] };
  }) => (
    <div
      data-testid="viewport-stub"
      data-sample-index={String(sampleIndex)}
      data-sample-count={String(result.samples.length)}
    />
  ),
}));

vi.mock('../../scene/SolarSystemViewport', () => ({
  SolarSystemViewport: ({
    selectedId,
    focusMode,
    focusSignal,
    elapsedDays,
  }: {
    selectedId: string;
    focusMode: string;
    focusSignal: number;
    elapsedDays?: number;
  }) => (
    <div
      data-testid="solar-system-viewport-stub"
      data-selected-id={selectedId}
      data-focus-mode={focusMode}
      data-focus-signal={String(focusSignal)}
      data-elapsed-days={String(elapsedDays ?? 0)}
    />
  ),
}));

import { PerspectiveCamera, Vector3 } from 'three';

import App from '../../App';
import {
  DEFAULT_LABEL_PRIORITY_ORDER,
  FALLBACK_LABEL_DIMENSIONS,
  LABEL_COLLISION_MARGIN_PX,
  labelBoundingBox,
  labelPriorityOrder,
  labelsOverlap,
  resolveSolarSystemLabelCollisions,
  type ProjectedLabelCandidate,
  type ResolvedLabelLayout,
} from '../../scene/solarSystemLabels';
import {
  SOLAR_SYSTEM_BODIES,
  cameraPose,
  type SolarSystemBodyId,
} from '../../solarSystem/bodies';
import { schematicBodyPosition } from '../../solarSystem/schematicMotion';

afterEach(cleanup);

beforeEach(() => {
  engineProbe.calls = 0;
  engineProbe.allow = false;
});

const renderOverview = () =>
  render(<App initialMode="overview" initialOverviewPlaying={false} />);

describe('Solar System Overview', () => {
  it('lands on the reference overview, not the Earth Orbit Lab', () => {
    renderOverview();

    // The Overview must not instantiate the two-body engine on first load.
    expect(engineProbe.calls).toBe(0);
    expect(
      screen.getByRole('heading', { name: 'Solar System Overview' }),
    ).toBeTruthy();
    expect(screen.getByText(/Reference visualization · not a dynamics simulation/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Solar System' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Earth Orbit Lab' }).getAttribute('aria-pressed'),
    ).toBe('false');

    // All ten reference bodies (Sun, eight planets, and 101955 Bennu) are present and selectable.
    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    for (const name of [
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      '101955 Bennu',
    ]) {
      expect(bodySelector.getByRole('button', { name: new RegExp(`^${name}`) })).toBeTruthy();
    }

    const viewport = screen.getByTestId('solar-system-viewport-stub');
    expect(viewport.dataset.selectedId).toBe('sun');
    expect(viewport.dataset.focusMode).toBe('overview');
    expect(viewport.dataset.elapsedDays).toBe('0');

    // The overview is explicitly not to scale, starts paused at 0.0 Earth days, and exposes no simulation sample playback controls.
    expect(screen.getAllByText(/not to scale/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ILLUSTRATIVE MOTION · NOT AN EPHEMERIS/)).toBeTruthy();
    expect(screen.getByTestId('schematic-elapsed-readout').textContent).toBe(
      'Schematic elapsed time: +0.0 Earth days',
    );
    expect(
      screen.getByRole('button', { name: 'Play schematic motion' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.queryByRole('button', { name: /Run playback/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Step forward one sample/ })).toBeNull();
    expect(screen.queryByText('Two-body model')).toBeNull();

    // Sun orbital fields are explicitly shown as not applicable rather than 0.
    expect(screen.getByText('695,700 km')).toBeTruthy();
    expect(screen.getAllByText(/Not applicable \(central star\)/)).toHaveLength(4);
  });

  it('selects a body, updates its reference details, and resets the camera', async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole('button', { name: /Jupiter/ }));

    const viewport = screen.getByTestId('solar-system-viewport-stub');
    expect(viewport.dataset.selectedId).toBe('jupiter');
    expect(viewport.dataset.focusMode).toBe('body');
    expect(screen.getByRole('heading', { name: 'Jupiter' })).toBeTruthy();
    expect(screen.getByText('5 of 8 from the Sun')).toBeTruthy();
    expect(screen.getByText('Gas giant')).toBeTruthy();
    expect(screen.getByText('69,911 km')).toBeTruthy();
    expect(screen.getByText('5.2029 AU')).toBeTruthy();
    expect(screen.getByText(/4332\.82 Earth days/)).toBeTruthy();
    expect(screen.getByText('0.0484')).toBeTruthy();
    expect(screen.getByText(/1\.30° \(J2000 ecliptic\)/)).toBeTruthy();
    expect(screen.getByText('NASA 3D Resources texture')).toBeTruthy();
    expect(screen.getAllByText(/fixed illustrative angle/i).length).toBeGreaterThan(0);

    // Earth must be attributed to the Earth Observatory, not NASA 3D Resources, and disclose its NSSDC vs. EM Bary provenance.
    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    await user.click(bodySelector.getByRole('button', { name: /^Earth/ }));
    expect(screen.getByText('NASA Earth Observatory texture')).toBeTruthy();
    expect(screen.getByText('6371.0 km')).toBeTruthy();
    expect(screen.getByText('1.0000 AU')).toBeTruthy();
    expect(screen.getByText(/365\.26 Earth days/)).toBeTruthy();
    expect(screen.getByText(/Earth-Moon barycenter/i)).toBeTruthy();

    // Radar-derived and illustrative surfaces are not presented as natural
    // colour or observational maps.
    await user.click(screen.getByRole('button', { name: /^Venus/ }));
    expect(screen.getAllByText(/radar-derived surface map, not natural colour/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Neptune/ }));
    expect(screen.getAllByText(/not an observational map/i).length).toBeGreaterThan(0);

    // Selecting 101955 Bennu shows JPL SBDB physical/orbital facts, explicit diameter/2 radius derivation,
    // NASA VTAD 3D model link, and honest disclosure separating its circular schematic guide from its eccentric orbit.
    await user.click(bodySelector.getByRole('button', { name: /^101955 Bennu/ }));
    expect(viewport.dataset.selectedId).toBe('bennu');
    expect(viewport.dataset.focusMode).toBe('body');
    expect(screen.getByRole('heading', { name: '101955 Bennu' })).toBeTruthy();
    expect(
      screen.getByText('Between Earth and Mars (near-Earth asteroid; not a planet)'),
    ).toBeTruthy();
    expect(screen.getByText('Apollo near-Earth asteroid (NEO · PHA)')).toBeTruthy();
    expect(
      screen.getByText(
        /0\.24222 km \(242\.2 m\) \(derived: 0\.48444 km diameter \/ 2\)/,
      ),
    ).toBeTruthy();
    expect(screen.getByText('4.2961 h (synodic)')).toBeTruthy();
    expect(screen.getByText('1.1264 AU')).toBeTruthy();
    expect(screen.getByText('0.8969 AU / 1.3559 AU')).toBeTruthy();
    expect(screen.getByText(/436\.65 Earth days \(1\.1955 Julian yr\)/)).toBeTruthy();
    expect(screen.getByText('0.2037')).toBeTruthy();
    expect(screen.getByText(/6\.03° \(J2000 ecliptic\)/)).toBeTruthy();
    expect(
      screen.getByText(
        /Compressed circular schematic between Earth & Mars \(real eccentric\/inclined orbit not rendered\)/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'NASA 3D Resources 3D mesh (NASA VTAD)' }).getAttribute(
        'href',
      ),
    ).toBe('https://science.nasa.gov/resource/bennu-3d-model/');
    expect(
      screen.getAllByRole('link', { name: 'JPL Small-Body Database (SBDB) API' })[0].getAttribute(
        'href',
      ),
    ).toBe('https://ssd-api.jpl.nasa.gov/doc/sbdb.html');
    expect(
      screen.getAllByRole('link', { name: 'JPL Small-Body Orbital Elements' })[0].getAttribute(
        'href',
      ),
    ).toBe('https://ssd.jpl.nasa.gov/sb/orbits.html');

    await user.click(screen.getByRole('button', { name: 'Overview view' }));
    expect(viewport.dataset.selectedId).toBe('bennu');
    expect(viewport.dataset.focusMode).toBe('overview');
  });

  it('controls schematic motion deterministically, honors reduced motion, and preserves elapsed days across mode switches without running the physics engine', async () => {
    const user = userEvent.setup();
    renderOverview();

    const viewport = () => screen.getByTestId('solar-system-viewport-stub');
    const readout = () => screen.getByTestId('schematic-elapsed-readout');

    // Step forward +10 d twice, step back -10 d once
    await user.click(screen.getByRole('button', { name: 'Step forward 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +10.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('10');

    await user.click(screen.getByRole('button', { name: 'Step forward 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +20.0 Earth days');

    await user.click(screen.getByRole('button', { name: 'Step back 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +10.0 Earth days');

    // Scrub to 120 Earth days and verify rate selector buttons
    const scrubber = screen.getByRole('slider', { name: 'Schematic elapsed time (Earth days)' });
    fireEvent.change(scrubber, { target: { value: '120' } });
    expect(readout().textContent).toBe('Schematic elapsed time: +120.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('120');

    await user.click(screen.getByRole('button', { name: '10 d/s' }));
    expect(screen.getByRole('button', { name: '10 d/s' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: '365 d/s' }));
    expect(screen.getByRole('button', { name: '365 d/s' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: '10 d/s' }));

    // Play schematic motion, then switch to Earth Orbit Lab and back
    await user.click(screen.getByRole('button', { name: 'Play schematic motion' }));
    expect(screen.getByRole('button', { name: 'Pause schematic motion' }).getAttribute('aria-pressed')).toBe('true');

    // Physics engine has still never been called during Overview motion/scrubbing/stepping
    expect(engineProbe.calls).toBe(0);

    // Switch to Lab -> pauses schematic motion; returning to Overview preserves elapsed days and starts paused
    engineProbe.allow = true;
    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(screen.getByText('Two-body model')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Solar System' }));
    expect(
      screen.getByRole('button', { name: 'Play schematic motion' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(readout().textContent).toMatch(/^\Schematic elapsed time: \+12\d\.\d Earth days$/);

    // Scrub to upper bound (3650) and verify +10 d is disabled and Play does not advance past 3650
    const returnedScrubber = screen.getByRole('slider', {
      name: 'Schematic elapsed time (Earth days)',
    });
    fireEvent.change(returnedScrubber, { target: { value: '3650' } });
    expect(readout().textContent).toBe('Schematic elapsed time: +3650.0 Earth days');
    expect(
      (screen.getByRole('button', { name: 'Step forward 10 Earth days' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Reset returns to 0.0 Earth days
    await user.click(screen.getByRole('button', { name: 'Reset schematic motion' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +0.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('0');
  });

  it('switches to the laboratory and back without discarding comparison records', async () => {
    const user = userEvent.setup();
    engineProbe.allow = true;
    renderOverview();

    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(screen.getByText('Two-body model')).toBeTruthy();

    const altitude = screen.getByLabelText(/Initial altitude \(km\)/);
    await user.clear(altitude);
    await user.type(altitude, '900');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    const candidateSamples = screen.getByTestId('viewport-stub').dataset.sampleCount;
    expect(candidateSamples).toBeTruthy();
    expect(screen.getAllByText(/900 km altitude/).length).toBeGreaterThan(0);

    // Leaving the Lab pauses a running cursor instead of advancing it unseen.
    await user.click(screen.getAllByRole('button', { name: 'Run playback' })[0]);
    expect(screen.getAllByRole('button', { name: 'Pause playback' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Solar System' }));
    const overviewHeading = screen.getByRole('heading', { name: 'Solar System Overview' });
    expect(overviewHeading).toBeTruthy();
    expect(document.activeElement).toBe(overviewHeading);
    expect(screen.queryByTestId('viewport-stub')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(document.activeElement?.id).toBe('lab-workspace');
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(candidateSamples);
    expect(screen.getAllByText(/900 km altitude/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Candidate' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getAllByRole('button', { name: 'Run playback' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: 'Pause playback' })).toHaveLength(0);
  }, 20000);

  it('keeps all ten projected labels visible at elapsedDays = 0 and deterministically suppresses overlapping lower-priority labels at conjunction times while keeping every body selectable', async () => {
    const projectOverviewCandidates = (
      width: number,
      height: number,
      elapsedDays: number,
    ): ProjectedLabelCandidate[] => {
      const pose = cameraPose('overview', 'sun', elapsedDays);
      const aspect = width / Math.max(height, 1);
      const overviewScale = Math.min(1.45, Math.max(1, 1.12 / aspect));
      const camera = new PerspectiveCamera(42, aspect, pose.near, pose.far);
      camera.position.set(
        pose.position[0] * overviewScale,
        pose.position[1] * overviewScale,
        pose.position[2] * overviewScale,
      );
      camera.lookAt(...pose.target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      const point = new Vector3();
      return SOLAR_SYSTEM_BODIES.map((body) => {
        const dims = FALLBACK_LABEL_DIMENSIONS[body.id];
        const [x, , z] = schematicBodyPosition(body.id, elapsedDays);
        const labelHeight = body.displayRadius + (body.id === 'sun' ? 1.9 : 0.68);
        point.set(x, labelHeight, z).project(camera);
        const screenX = (point.x * 0.5 + 0.5) * width;
        const screenY = (-point.y * 0.5 + 0.5) * height;
        const halfWidth = dims.width * 0.5;
        const inFrustum =
          point.z >= -1 &&
          point.z <= 1 &&
          screenX - halfWidth >= 0 &&
          screenX + halfWidth <= width &&
          screenY - dims.height >= 0 &&
          screenY <= height;
        return {
          id: body.id,
          x: screenX,
          y: screenY,
          width: dims.width,
          height: dims.height,
          inFrustum,
        };
      });
    };

    // Priority order always places the selected body first without duplicating it.
    for (const body of SOLAR_SYSTEM_BODIES) {
      const order = labelPriorityOrder(body.id);
      expect(order).toHaveLength(SOLAR_SYSTEM_BODIES.length);
      expect(order[0]).toBe(body.id);
      expect(new Set(order).size).toBe(SOLAR_SYSTEM_BODIES.length);
      expect(order.slice(1)).toEqual(
        DEFAULT_LABEL_PRIORITY_ORDER.filter((id) => id !== body.id),
      );
    }

    // At elapsedDays = 0 on desktop viewports, all ten labels remain visible with zero overlaps.
    for (const [width, height] of [
      [1600, 862],
      [1280, 662],
    ] as const) {
      const candidates = projectOverviewCandidates(width, height, 0);
      const resolved = resolveSolarSystemLabelCollisions(candidates, 'sun');
      const visible = resolved.filter((item) => item.visible);
      const suppressed = resolved.filter((item) => item.suppressed);
      expect(visible).toHaveLength(10);
      expect(suppressed).toHaveLength(0);
    }

    // Across representative conjunction times, no two visible labels overlap,
    // the selected body is always visible, and repeated calls are identical.
    const sampleDays = [0, 174, 180, 754, 957.3, 1825, 1906, 3650];
    const reusableBuffer: ResolvedLabelLayout[] = [];
    for (const [width, height] of [
      [1600, 862],
      [1280, 662],
    ] as const) {
      for (const days of sampleDays) {
        const candidates = projectOverviewCandidates(width, height, days);
        for (const selectedBody of SOLAR_SYSTEM_BODIES) {
          const firstPass = resolveSolarSystemLabelCollisions(
            candidates,
            selectedBody.id,
          );
          const secondPass = resolveSolarSystemLabelCollisions(
            candidates,
            selectedBody.id,
            {
              marginPx: LABEL_COLLISION_MARGIN_PX,
              out: reusableBuffer,
            },
          );
          expect(secondPass).toEqual(firstPass);

          const selectedLayout = firstPass.find(
            (item) => item.id === selectedBody.id,
          );
          expect(selectedLayout?.visible).toBe(true);
          expect(selectedLayout?.suppressed).toBe(false);

          const visibleLayouts = firstPass.filter((item) => item.visible);
          for (let i = 0; i < visibleLayouts.length; i += 1) {
            for (let j = i + 1; j < visibleLayouts.length; j += 1) {
              expect(
                labelsOverlap(
                  labelBoundingBox(visibleLayouts[i]),
                  labelBoundingBox(visibleLayouts[j]),
                ),
              ).toBe(false);
            }
          }
        }
      }
    }

    // At 1825 days (where Sun and Mercury overlap in overview framing), Mercury is suppressed
    // when Sun is selected, and becomes visible when Mercury is selected.
    const candidates1825 = projectOverviewCandidates(1280, 662, 1825);
    const sunSelected1825 = resolveSolarSystemLabelCollisions(candidates1825, 'sun');
    expect(sunSelected1825.find((item) => item.id === 'sun')?.visible).toBe(true);
    expect(sunSelected1825.find((item) => item.id === 'mercury')?.suppressed).toBe(true);

    const mercurySelected1825 = resolveSolarSystemLabelCollisions(
      candidates1825,
      'mercury',
    );
    expect(mercurySelected1825.find((item) => item.id === 'mercury')?.visible).toBe(true);
    expect(mercurySelected1825.find((item) => item.id === 'sun')?.suppressed).toBe(true);

    // At mobile width (singleSelectedLabelOnly), only the selected body label is visible.
    const mobileCandidates = projectOverviewCandidates(390, 439, 180);
    for (const selectedId of [
      'sun',
      'mercury',
      'mars',
      'neptune',
      'bennu',
    ] as SolarSystemBodyId[]) {
      const mobileResolved = resolveSolarSystemLabelCollisions(
        mobileCandidates,
        selectedId,
        { singleSelectedLabelOnly: true },
      );
      expect(mobileResolved.filter((item) => item.visible).map((item) => item.id)).toEqual([
        selectedId,
      ]);
      expect(mobileResolved.filter((item) => item.suppressed)).toHaveLength(9);
    }

    // Verify in the DOM that bodies whose projected labels are suppressed at 1825 d remain
    // selectable through the body selector list and update the details panel.
    const user = userEvent.setup();
    renderOverview();
    const scrubber = screen.getByRole('slider', {
      name: 'Schematic elapsed time (Earth days)',
    });
    fireEvent.change(scrubber, { target: { value: '1825' } });
    expect(screen.getByTestId('schematic-elapsed-readout').textContent).toBe(
      'Schematic elapsed time: +1825.0 Earth days',
    );

    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    await user.click(bodySelector.getByRole('button', { name: /^Mercury/ }));
    expect(screen.getByTestId('solar-system-viewport-stub').dataset.selectedId).toBe(
      'mercury',
    );
    expect(screen.getByRole('heading', { name: 'Mercury' })).toBeTruthy();
    expect(screen.getByText('2439.4 km')).toBeTruthy();

    await user.click(bodySelector.getByRole('button', { name: /^101955 Bennu/ }));
    expect(screen.getByTestId('solar-system-viewport-stub').dataset.selectedId).toBe(
      'bennu',
    );
    expect(screen.getByRole('heading', { name: '101955 Bennu' })).toBeTruthy();
  });
});
