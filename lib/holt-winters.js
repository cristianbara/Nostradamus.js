/* Holt-Winters triple exponential smoothing
 * see: http://www.itl.nist.gov/div898/handbook/pmc/section4/pmc435.htm
 *
 * @param {array} data input data (Float64Array)
 * @param {number} alpha overall smoothing parameter (float)
 * @param {number} beta seasonal smoothing parameter (float)
 * @param {number} gamma trend smoothing parameter (float)
 * @param {number} period (int)
 * @param {number} m how many periods to forecast ahead (int)
 *
 * @return {Float64Array}
 */
function forecast(data, alpha, beta, gamma, period, m) {
	var seasons, seasonal;

	if (!validArgs(data, alpha, beta, gamma, period, m))
		return;

	seasons = Math.floor(data.length / period);
	st_1 = data[0];
	bt_1 = initialTrend(data, period);
	seasonal = seasonalIndices(data, period, seasons);

	return calcHoltWinters(data, st_1, bt_1, alpha, beta, gamma, seasonal, period, m);
}

module.exports = forecast;

function validArgs(data, alpha, beta, gamma, period, m) {
	if (!data.length)
		return false;
	if (m <= 0)
		return false;
	if (m > period)
		return false;
	if (alpha < 0.0 || alpha > 1.0)
		return false;
	if (beta < 0.0 || beta > 1.0)
		return false;
	if (gamma < 0.0 || gamma > 1.0)
		return false;
	return true;
}

function initialTrend(data, period) {
	var sum = 0;
	for (var i = 0; i < period; i++) {
		sum += (data[period + i] - data[i]);
	}
	return sum / (period * period);
}

function seasonalIndices(data, period, seasons) {
	var savg, obsavg, si, i, j;

	savg = Array(seasons);
	obsavg = Array(data.length);

	si = Array(period);

	// zero-fill savg[] and si[]
	for (i = 0; i < seasons; i++) {
		savg[i] = 0.0;
	}
	for (i = 0; i < period; i++) {
		si[i] = 0.0;
	}

	// seasonal averages
	for (i = 0; i < seasons; i++) {
		for (j = 0; j < period; j++) {
			savg[i] += data[(i*period) + j];
		}
		savg[i] /= period;
	}
	// averaged observations
	for (i = 0; i < seasons; i++) {
		for (j = 0; j < period; j++) {
			obsavg[(i*period) + j] = data[(i*period) + j] / savg[i];
		}
	}
	// seasonal indices
	for (i = 0; i < period; i++) {
		for (j = 0; j < seasons; j++) {
			si[i] += obsavg[(j*period) + i];
		}
		si[i] /= seasons;
	}

	return si;
}

function calcHoltWinters(data, st_1, bt_1, alpha, beta, gamma, seasonal, period, m) {
	var len = data.length,
		st = Array(len), // overall smoothing component
		bt = Array(len), // trend smoothing component
		it = Array(len), // seasonal smoothing component
		ft = Array(len), // generated forecast
		i; // reusable idx
	
	// initial level st[1] == st_1 == data[0] ... see function forecast()
	st[1] = st_1;
	// initial trend bt[1] == bt_1 == initialTrend(data, period) ... see function forecast()
	bt[1] = bt_1;

	// zero-fill ft[] (to clean up undefined values at start of forecast array --i.e. ft[])
	for (i = 0; i < len; i++) {
		ft[i] = 0.0;
	}

	// initial seasonal indices it[]
	for (i = 0; i < period; i++) {
		it[i] = seasonal[i];
	}

	for (var i = 2; i < len; i++) {
		// overall level smoothing component st[]
		if (i - period >= 0) {
			st[i] = ((alpha * data[i]) / it[i - period]) +
					((1.0 - alpha) * (st[i - 1] + bt[i - 1]));
		} else {
			st[i] = (alpha * data[i]) + ((1.0 - alpha) *
					(st[i - 1] + bt[i - 1]));
		}

		// trend smoothing component bt[]
		bt[i] = (gamma * (st[i] - st[i - 1])) +
				((1 - gamma) * bt[i - 1]);

		// seasonal smoothing component it[]
		if (i - period >= 0) {
			it[i] = ((beta * data[i]) / st[i]) +
					((1.0 - beta) * it[i - period]);
		}

		// generate forecast as ft[]
		if (i + m >= period) {
			ft[i + m] = (st[i] + (m * bt[i])) *
						it[i - period + m];
		}
	}

	// -> forecast[]
	return ft;
}
