/**
 * WebSlicer
 * Copyright (C) 2016 Marcio Teixeira
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
var failed = 0;
var passed = 0;

function assertEquals(lhs,rhs) {
	var lhs_eval = eval(lhs);
	var rhs_eval = eval(rhs);
	
	if(lhs_eval.constructor === Array) {
		lhs_eval = lhs_eval.toString();
	}
	
	if(rhs_eval.constructor === Array) {
		rhs_eval = rhs_eval.toString();
	}

	if(lhs_eval !== rhs_eval) {
		document.write("<P>FAILED: assertEquals: " + lhs + " is " + lhs_eval + " expected " + rhs_eval + "</P>");
		failed++;
	} else {
		//document.write("<P>PASSED: assertEquals: " + lhs + " is " + lhs_eval + " which matches " + rhs_eval + "</P>");
		passed++;
	}
}

function assertNotEquals(lhs,rhs) {
	var lhs_eval = eval(lhs);
	var rhs_eval = eval(rhs);
	
	if(lhs_eval.constructor === Array) {
		lhs_eval = lhs_eval.toString();
	}
	
	if(rhs_eval.constructor === Array) {
		rhs_eval = lhs_eval.toString();
	}

	if(lhs_eval ===  rhs_eval) {
		document.write("<P>FAILED: assertEquals: " + lhs + " is " + lhs_eval + " expected " + rhs_eval + "</P>");
		failed++;
	} else {
		//document.write("<P>PASSED: assertEquals: " + lhs + " is " + rhs_eval + "</P>");
		passed++;
	}
}

function summarize() {
	if(failed) {
			document.write("<P>TESTS FAILED!</P>");
	} else {
		document.write("<P>" + passed + " TESTS PASSED!</P>");
	}
}